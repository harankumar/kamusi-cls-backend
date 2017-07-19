"use strict"

// TODO: handle errors better

const isoConv = require('iso-language-converter')
const express = require('express')
const fs = require('fs')
const trie = require('trie-prefix-tree')
const arrayUnion = require('array-union')
const geoip = require('geoip-lite')


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

let langpop = JSON.parse(fs.readFileSync("langpop.json"))
let userlangs = JSON.parse(fs.readFileSync("userlangs.json"))
let userlangtrie = trie(JSON.parse(fs.readFileSync("userlangnames.json")))
let namestocodes = JSON.parse(fs.readFileSync("namestocodes.json"))
let codestonames = JSON.parse(fs.readFileSync("codestonames.json"))
let engNames = JSON.parse(fs.readFileSync("langnames/eng.json"))

String.prototype.toProperCase = function () {
    return this.replace(/([^\W_]+[^\s-]*) */g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()})
}

Array.prototype.toProperCase = function (){
  return this.map((x) => x.toProperCase())
}

app.get("/userlangs/:prefix", function(request, response){
  response.set('Access-Control-Allow-Origin', '*')

  var prefix = request.params.prefix

  var data = userlangtrie.getPrefix(prefix).map(function(x){
    return {"text": x.toProperCase(), "id": namestocodes[x]}
  })

  if (codestonames[prefix] && codestonames[prefix].length > 0){
    let tempData = (typeof codestonames[prefix] === "string") ?
                      [{text: codestonames[prefix], id: prefix}] :
                      codestonames[prefix].map(function(x){return {text:x, id: prefix}})

    // This is super hacky, sorry!
    let existingData = new Set(data.map((x) => x.text))
    for (let d of tempData){
      if (existingData.has(d.text)){
        data.splice(data.indexOf(data.filter((x) => x.text === d.text)[0]),1)

      }
    }
    data = arrayUnion(tempData, data)
  }

  data.sort((a, b) => langpop[b.id] - langpop[a.id])

  response.send(JSON.stringify(data.slice(0, 10), null, 2))
})

app.get("/langnames/:code", function(request, response){
  response.set('Access-Control-Allow-Origin', '*')
  fs.readFile("langnames/" + request.params["code"] + ".json", function(err, data){
    if (err)
      response.send(JSON.stringify([{}], null, 2))
    else {
      let langdata = JSON.parse(data)

      response.send(JSON.stringify(Object.keys(langdata).map(function(x){return {id: x, text: langdata[x].toProperCase()}}), null, 2))
    }
  })
})

app.get("/territories/:code", function(request, response){
  response.set('Access-Control-Allow-Origin', '*')
  fs.readFile("territories/" + request.params["code"] + ".json", function(err, data){
    if (err)
      response.send(JSON.stringify([{}], null, 2))
    else {
      const rawdata = JSON.parse(data)
      const loc = geoip.lookup(request.headers['x-forwarded-for'] || request.connection.remoteAddress)
      const terrdata = arrayUnion((loc.country && rawdata[loc.country]) ? [{id: loc.country, text: rawdata[loc.country]}] : [],
                                  Object.keys(rawdata).sort().filter((x) => x!==loc.country).map(function(x){return {id: x, text: rawdata[x].toProperCase()}}))

      response.send(JSON.stringify(terrdata, null, 2))
    }
  })
})

app.get("/userlangs", function (request, response) {
  response.set('Access-Control-Allow-Origin', '*')
  response.send(getLangs(request).map(function(x){
    return {text: codestonames[x].map((x) => x.toProperCase()), id: x}
  }))
})

app.get("/engname/:code", function (request, response) {
  response.set('Access-Control-Allow-Origin', '*')
  const code = request.params["code"]
  response.send(engNames[code] || codestonames[code][0])
})
