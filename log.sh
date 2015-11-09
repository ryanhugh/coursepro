cd ~/courseproio

export lines=$1
if [ -z "$lines" ]; then
        export lines=200
fi

tail -f log.log -n $lines | python tail.py