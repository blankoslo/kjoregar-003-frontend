#!/bin/bash

remote="" # vast.ai
port=50000 # vast.ai
ssh -p $port -N -R 3030:localhost:3030 root@$remote
