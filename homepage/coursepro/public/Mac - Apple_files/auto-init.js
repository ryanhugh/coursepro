(function(){var e=require("ac-analytics");var a=document.addEventListener?"addEventListener":"attachEvent";
var f=document.addEventListener?"":"on";var c={};var d;function b(g){if(typeof g!=="string"){return false
}g=g.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@");g=g.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]");
g=g.replace(/(?:^|:|,)(?:\s*\[)+/g,"");return(/^[\],:{}\s]*$/).test(g)}document[a](f+"readystatechange",function(){if(document.readyState==="complete"){d=document.documentElement.getAttribute("data-analytics-page-view");
if(b(d)){c.page=JSON.parse(d)}e.createBasicObserverSuite(c)}})}());