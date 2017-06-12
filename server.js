const isoConv = require('iso-language-converter');
const express = require('express');
const fs = require('fs')
const trie = require('trie-prefix-tree');


const app = express();

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

function getLangs(request){
  return request.header('Accept-Language')
                .split(',')
                .map(function (clause) {
                    return cldrToISO6933(clause.split(';')[0]);
                })
                .removeDuplicates();
}

function cldrToISO6933(cldr){
  const iso6931 = cldr.split("-")[0];
  return isoConv(iso6931, {from: 1, to: 3});
}

Array.prototype.removeDuplicates = function(){
  let i = 0;
  while (i < this.length){
    let indOf = i + 1;
    while (i < this.length){
      if (this[i] === this[indOf])
        break;
      i++;
    }
    
    if (indOf === this.length)
      i++;
    else
      this.splice(indOf, 1);
  }
  return this;
}

let userlangs = null
let userlangtrie = null
let namestocodes = null
let codestonames = null
fs.readFile("userlangs.json", function(err, data){
  if (err)
    throw err
  
  userlangs = JSON.parse(data)
})
fs.readFile("namestocodes.json", function(err, data){
  if (err)
    throw err
  
  namestocodes = JSON.parse(data)
})
fs.readFile("namestocodes.json", function(err, data){
  if (err)
    throw err
  
  codestonames = JSON.parse(data)
})
fs.readFile("userlangnames.json", function(err, data){
  if (err)
    throw err
  
  userlangtrie = trie(JSON.parse(data))
})

String.prototype.toProperCase = function () {
    return this.replace(/([^\W_]+[^\s-]*) */g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

app.get("/:prefix", function(req, res){
  res.send(userlangtrie.getPrefix(req.params["prefix"]).map(function(x){
    return {"name": x.toProperCase(), "code": namestocodes[x]}
  }))
})

app.get("/", function (request, response) {
  response.set('Access-Control-Allow-Origin', '*');
  response.send(getLangs(request).map(function(x){
    console.log(x)
    return {"name": codestonames[x].toProperCase(), "code": x}
  }));
});