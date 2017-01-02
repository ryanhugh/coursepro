#!/bin/bash

for i in $(find . | grep .*.html\$) # or whatever other pattern...
do
	echo $i
  if ! grep -q Copyright $i
  then
    cat header.txt $i >$i.new && mv $i.new $i
  fi
done