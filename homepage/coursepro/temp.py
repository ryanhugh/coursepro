"""
Here I define my variables. This is just like equating a variable in calculus.
"""
n = 5
a = 0
b = .5
h = (b-a)/n

"""makes a list for the y values from y(0) to y(n+1)...think of this as y(x).... it returns a stored value
for each spot in the list. For now, the list looks like ylist = (0,1,2,3,4,5)... it gives the corsiponding y
value to the given x value.
"""
ylist=[]
for i in range(n+1):
	ylist.append(i)

"""
Here i defined y(0) to = 1. so ylist(x which in this case is 0) = 1. so at x=0 y=1.
"""
ylist[0]=1

"""
Here i define a function yprime. This function solves for the derivative of y at a given x valueusing the equation
given. When calling this function you call it like this: yprime(x value). A function is not executed here but is
called from other areas of the code.
"""
def yprime(x):
	yprime = -2.0*(x*h)*ylist[x]*ylist[x]
	return yprime

"""
Here I go through a for loop. A foor loop will loop through the same piece of code a given amount of times.
Here it goes through n amount of times, and feeds in a variable i which is equal to numbers 1 through n. 
This for loop goes through and solves for each instance of y sub n. It then adds it to the list ylist. 
"""
for i in range(1,n+1):
	ylist[i] = ylist[i-1] + h*yprime(i-1)

"""
Now i can print the list of all of them
"""
print ylist
"""
or i can print it in a nicer format
"""
for i in range(n+1):
	print "y sub", i, "=", ylist[i]
