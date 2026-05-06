import re
import os
import subprocess
import json

def get_tfvar(name):
    with open('terraform.tfvars', 'r') as f:
        content = f.read()
        match = re.search(f'{name}\s*=\s*"([^"]+)"', content)
        if match:
            return match.group(1)
    return None

ak = get_tfvar('aws_access_key')
sk = get_tfvar('aws_secret_key')
st = get_tfvar('aws_session_token')
region = get_tfvar('aws_region') or 'us-east-1'

env = os.environ.copy()
env['AWS_ACCESS_KEY_ID'] = ak
env['AWS_SECRET_ACCESS_KEY'] = sk
env['AWS_SESSION_TOKEN'] = st
env['AWS_DEFAULT_REGION'] = region

alb_arn = "arn:aws:elasticloadbalancing:us-east-1:415101737817:loadbalancer/app/vinylmania-alb/962611a9eba96223"

try:
    result = subprocess.run(
        ['aws', 'elbv2', 'describe-listeners', '--load-balancer-arn', alb_arn, '--query', 'Listeners[*].ListenerArn', '--output', 'json'],
        capture_output=True, text=True, env=env
    )
    if result.returncode == 0:
        print(result.stdout.strip())
    else:
        print(f"Error: {result.stderr}")
except Exception as e:
    print(f"Exception: {e}")
