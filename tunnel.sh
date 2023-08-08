#!/bin/bash

remote="" # vast.ai
port=11419 # vast.ai
ssh -i ~/.ssh/id_ed_vast -p $port -N -R 3030:localhost:3030 root@$remote
