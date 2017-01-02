#!/bin/bash

for i in *.js # or whatever other pattern...
do
	echo hi
  if ! grep -q Copyright $i
  then
    cat header.txt $i >$i.new && mv $i.new $i
  fi
done