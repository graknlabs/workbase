#!/usr/bin/env python

from __future__ import print_function

import os
import subprocess as sp
import tempfile
import time


def ssh(command, ssh_host, ssh_user, ssh_pass):
    sp.check_call([
        'sshpass',
        '-p',
        ssh_pass,
        'ssh',
        '-o',
        'StrictHostKeyChecking=no',
        '-o',
        'ConnectTimeout=2',
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
            ssh('dir', ssh_host, ssh_user, ssh_pass)
            return
        except sp.CalledProcessError as e:
            if e.returncode == 255:
                print('called command, status = 255; sleeping 5 secs (elapsed {} secs)'.format(time_elapsed_in_seconds()))
                time.sleep(5)
            else:
                raise e

    raise Exception('Time limit exceeded while waiting for instance to come alive')


def replace_git_url_to_https(url):
    return url.replace(':', '/').replace('git@', 'https://')


print('Installing sshpass')
sp.check_call([
    'sudo', 'apt-get', 'update'
])

sp.check_call([
    'sudo', 'apt-get', 'install', 'sshpass'
])

print('Configuring GCP credentials')
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

print('Generating password for instance')
instance_password = sp.check_output([
    'openssl', 'rand', '-base64', '12'
]).strip()

instance_name = 'circleci-{}-{}'.format(
    os.getenv('CIRCLE_JOB'), os.getenv('CIRCLE_BUILD_NUM'))

print('Generating bootup script for instance [{}]'.format(instance_name))
with tempfile.NamedTemporaryFile(suffix='.ps1') as powershell_script:
    with open('.circleci/build-workbase-win/instance-setup-template.ps1') as template:
        powershell_script.write(template.read().replace('INSTANCE_PASSWORD', instance_password).encode())
        powershell_script.flush()

    print('Provisioning instance [{}]'.format(instance_name))
    sp.check_call([
        'gcloud', 'compute', 'instances', 'create', instance_name,
        '--image-project', 'windows-cloud', '--image-family', 'windows-2019',
        '--machine-type', 'n1-standard-1', '--metadata-from-file',
        'sysprep-specialize-script-ps1={}'.format(powershell_script.name)
    ])

print('Storing instance\'s external IP')
instance_ip = sp.check_output([
    'gcloud', '--format', 'value(networkInterfaces[0].accessConfigs[0].natIP)',
    'compute', 'instances', 'list', '--filter', 'name={}'.format(instance_name)
])


try:
    print('Waiting for instance to some alive (sshd)')
    wait_for_ssh(instance_ip, 'circleci', instance_password)

    print('Executing command remotely')
    ssh('dir', instance_ip, 'circleci', instance_password)

    print('Executing PowerShell command remotely [Get-LocalUser]')
    ssh('powershell Get-LocalUser', instance_ip, 'circleci', instance_password)

    print('Installing git')
    ssh('choco install git -y', instance_ip, 'circleci', instance_password)

    print('Installing nodejs 8')
    ssh('choco install nodejs -y --version 8.15.0', instance_ip, 'circleci', instance_password)

    print('Cloning workbase')
    ssh(
        'refreshenv && git clone {repo_url} repo && cd repo && git checkout {repo_commit}'.format(
            repo_url=replace_git_url_to_https(os.getenv('CIRCLE_REPOSITORY_URL')),
            repo_commit=os.getenv('CIRCLE_SHA1')),
        instance_ip, 'circleci', instance_password)

    print('[Remote]: npm install')
    ssh('refreshenv && cd repo && npm install', instance_ip, 'circleci', instance_password)

    print('[Remote]: npm run build')
    ssh('refreshenv && cd repo && npm run build', instance_ip, 'circleci', instance_password)

    print('Copying built Workbase executable from remote to local')
    scp('C:\\Users\\circleci\\repo\\build\\GRAKNW~1.EXE', './grakn-setup.exe', instance_ip, 'circleci', instance_password)

    print('Verifying local file')
    sp.check_call(['file', './grakn-setup.exe'])


finally:
    print('Remove instance')
    sp.check_call([
        'gcloud', '--quiet', 'compute', 'instances',
        'delete', instance_name, '--delete-disks=all'
    ])
