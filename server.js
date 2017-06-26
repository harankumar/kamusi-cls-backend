"use strict"

// TODO: handle errors better

const isoConv = require('iso-language-converter')
const express = require('express')
const fs = require('fs')
const trie = require('trie-prefix-tree')
const arrayUnion = require('array-union')


const app = express()

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port)
})

function getLangs(request){
  return arrayUnion(request.header('Accept-Language')
                    .split(',')
                    .map(function (clause) {
                        return cldrToISO6933(clause.split(';')[0])
                    }))
}

function cldrToISO6933(cldr){
  const iso6931 = cldr.split("-")[0]
  return isoConv(iso6931, {from: 1, to: 3})
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
fs.readFile("codestonames.json", function(err, data){
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
    return this.replace(/([^\W_]+[^\s-]*) */g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()})
}

app.get("/userlangs/:prefix", function(request, response){
  response.set('Access-Control-Allow-Origin', '*')
  
  var prefix = request.params.prefix
  
  var data = userlangtrie.getPrefix(prefix).map(function(x){
    return {"text": x.toProperCase(), "id": namestocodes[x]}
  })
  
  if (prefix.length === 3 && codestonames[prefix]){
    // This is super hacky, sorry!
    let tempData = codestonames[prefix].map(function(x){return {text:x, id: prefix}})
    let existingData = new Set(data.map((x) => x.text))
    for (let d of tempData){
      if (existingData.has(d.text)){
        data.splice(data.indexOf(data.filter((x) => x.text === d.text)[0]),1)
        
      }
    }
    data = arrayUnion(tempData, data)
  }
  
  response.send(JSON.stringify(data.slice(0, 10), null, 2))
})

app.get("/langnames/:code", function(request, response){
  response.set('Access-Control-Allow-Origin', '*')
  // fs.readFile("langnames/afr.json", {encoding: "utf8"}, function(err, data){
  fs.readFile("langnames/" + request.params["code"] + ".json", function(err, data){
    if (err)
      response.send(JSON.stringify([{}], null, 2))
    else {
      let langdata = JSON.parse(data)
      
      response.send(JSON.stringify(Object.keys(langdata).map(function(x){return {id: x, text: langdata[x].toProperCase()}}), null, 2))
    }
  })
})

app.get("/userlangs", function (request, response) {
  response.set('Access-Control-Allow-Origin', '*')
  response.send(getLangs(request).map(function(x){
    return {text: codestonames[x].map((x) => x.toProperCase()), id: x}
  }))
})