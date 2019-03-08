#!/usr/bin/env python

from __future__ import print_function

import os
import subprocess as sp
import tempfile
import time

MACHINE_TYPE = 'n1-standard-8'
VALID_EXIT_CODES = {
    5,   # Permission denied, please try again.
         # (valid because sshd comes alive earlier than user is created)
    255  # SSH error
}


def lprint(msg):
    # TODO: replace with proper logging
    from datetime import datetime
    print('[{}]: {}'.format(datetime.now().isoformat(), msg))


def ssh(command, ssh_host, ssh_user, ssh_pass, attempts=5):
    sp.check_call([
        'sshpass',
        '-p',
        ssh_pass,
        'ssh',
        '-o',
        'StrictHostKeyChecking=no',
        '-o',
        'ConnectTimeout=2',
        '-o',
        'ConnectionAttempts={}'.format(attempts),
        '{}@{}'.format(ssh_user, ssh_host),
        command
    ])


def scp(remote, local, ssh_host, ssh_user, ssh_pass):
    sp.check_call([
        'sshpass',
        '-p',
        ssh_pass,
        'scp',
        '{}@{}:"{}"'.format(ssh_user, ssh_host, remote),
        local,
    ])


def wait_for_ssh(ssh_host, ssh_user, ssh_pass, timeout_mins=10):
    def time_elapsed_in_seconds():
        return time.time() - start_time

    def time_limit_exceeded():
        return (time_elapsed_in_seconds() // 60) > timeout_mins

    start_time = time.time()

    while not time_limit_exceeded():
        try:
            ssh('dir', ssh_host, ssh_user, ssh_pass, attempts=1)
            return
        except sp.CalledProcessError as e:
            if e.returncode in VALID_EXIT_CODES:
                print('called command, status = {}; sleeping 5 secs (elapsed {} secs)'.format(
                    e.returncode, time_elapsed_in_seconds()))
                time.sleep(5)
            else:
                raise e

    raise Exception('Time limit exceeded while waiting for instance to come alive')


def replace_git_url_to_https(url):
    return url.replace(':', '/').replace('git@', 'https://')


lprint('Installing sshpass')
sp.check_call([
    'sudo', 'apt-get', '-qq', 'update'
])

sp.check_call([
    'sudo', 'apt-get', '-qq', 'install', '-y', 'sshpass'
])

lprint('Configuring GCP credentials')
with tempfile.NamedTemporaryFile(suffix='.json') as credential_file:
    credential_file.write(os.getenv('GCP_CREDENTIAL').encode())
    credential_file.flush()
    sp.check_call([
        'gcloud', 'auth', 'activate-service-account', '--key-file', credential_file.name
    ])

sp.check_call([
    'gcloud', 'config', 'set', 'project', 'grakn-dev'
])
sp.check_call([
    'gcloud', 'config', 'set', 'compute/zone', 'europe-west1-b'
])

lprint('Generating password for instance')
instance_password = sp.check_output([
    'openssl', 'rand', '-base64', '12'
]).strip()

instance_name = 'circleci-{}-{}'.format(
    os.getenv('CIRCLE_JOB'), os.getenv('CIRCLE_BUILD_NUM'))

lprint('Generating bootup script for instance [{}]'.format(instance_name))
with tempfile.NamedTemporaryFile(suffix='.ps1') as powershell_script:
    with open('.circleci/build-workbase-win/instance-setup-template.ps1') as template:
        powershell_script.write(template.read().replace('INSTANCE_PASSWORD', instance_password).encode())
        powershell_script.flush()

    lprint('Provisioning instance [{}]'.format(instance_name))
    sp.check_call([
        'gcloud', 'compute', 'instances', 'create', instance_name,
        '--image', 'circleci-workbase-build',
        '--machine-type', MACHINE_TYPE, '--metadata-from-file',
        'sysprep-specialize-script-ps1={}'.format(powershell_script.name)
    ])

lprint('Storing instance\'s external IP')
instance_ip = sp.check_output([
    'gcloud', '--format', 'value(networkInterfaces[0].accessConfigs[0].natIP)',
    'compute', 'instances', 'list', '--filter', 'name={}'.format(instance_name)
]).strip()


try:
    lprint('Waiting for instance to some alive (sshd)')
    wait_for_ssh(instance_ip, 'circleci', instance_password)

    lprint('Executing command remotely')
    ssh('dir', instance_ip, 'circleci', instance_password)

    lprint('[Remote]: setting env variables')
    ssh(' && '.join([
        'SETX BAZEL_SH C:\\tools\\msys64\\usr\\bin\\bash.exe',
        'SETX BAZEL_VC "C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\BuildTools\\VC"',
        'SETX PATH "%PATH%;C:\\tools\\msys64\\usr\\bin"'
    ]), instance_ip, 'circleci', instance_password)

    lprint('[Remote] Cloning workbase')
    ssh(' && '.join([
        'refreshenv',
        'git clone {} repo'.format(replace_git_url_to_https(os.getenv('CIRCLE_REPOSITORY_URL'))),
        'cd repo',
        'git checkout -b ci-branch {}'.format(os.getenv('CIRCLE_SHA1'))
    ]), instance_ip, 'circleci', instance_password)

    lprint('[Remote]: building @graknlabs_grakn_core//:assemble-mac-zip')
    ssh(' && '.join([
        'refreshenv',
        'cd repo',
        'bazel build @graknlabs_grakn_core//:assemble-mac-zip'
    ]), instance_ip, 'circleci', instance_password)

    lprint('[Remote]: unpacking Grakn')
    ssh(' && '.join([
        'cd repo',
        'unzip bazel-genfiles/external/graknlabs_grakn_core/grakn-core-all-mac.zip -d bazel-genfiles/dist/'
    ]), instance_ip, 'circleci', instance_password)

    lprint('[Remote]: starting Grakn')
    ssh(' && '.join([
        'refreshenv',
        'cd repo',
        'bash bazel-genfiles/dist/grakn-core-all-mac/grakn server start'
    ]), instance_ip, 'circleci', instance_password)

    lprint('[Remote]: populating Grakn')
    ssh(' && '.join([
        'refreshenv',
        'cd repo',
        'bash bazel-genfiles/dist/grakn-core-all-mac/grakn console -f C:\\Users\\circleci\\repo\\test\\helpers\\basic-genealogy.gql -k gene'
    ]), instance_ip, 'circleci', instance_password)

    lprint('[Remote]: running npm install')
    ssh(' && '.join([
        'refreshenv',
        'cd repo',
        'bazel run @nodejs//:bin/npm.cmd -- install'
    ]), instance_ip, 'circleci', instance_password)

    lprint('[Remote]: running npm run build')
    ssh(' && '.join([
        'refreshenv',
        'cd repo',
        'bazel run @nodejs//:bin/npm.cmd -- run build'
    ]), instance_ip, 'circleci', instance_password)

    lprint('Copying built Workbase executable from remote to local')
    scp('C:\\Users\\circleci\\repo\\build\\GRAKNW~1.EXE', './grakn-setup.exe', instance_ip, 'circleci', instance_password)

    lprint('Verifying local file')
    sp.check_call(['file', './grakn-setup.exe'])

    lprint('[Remote]: running npm run unit')
    ssh(' && '.join([
        'refreshenv',
        'cd repo',
        'bazel run @nodejs//:bin/npm.cmd -- run unit'
    ]), instance_ip, 'circleci', instance_password)

    lprint('[Remote]: running npm run integration')
    ssh(' && '.join([
        'refreshenv',
        'cd repo',
        'bazel run @nodejs//:bin/npm.cmd -- run integration'
    ]), instance_ip, 'circleci', instance_password)

    # lprint('[Remote]: running npm run e2e')
    # ssh(' && '.join([
    #     'refreshenv',
    #     'cd repo',
    #     'bazel run @nodejs//:bin/npm.cmd -- run e2e'
    # ]), instance_ip, 'circleci', instance_password)

finally:
    lprint('Remove instance')
    sp.check_call([
        'gcloud', '--quiet', 'compute', 'instances',
        'delete', instance_name, '--delete-disks=all'
    ])
