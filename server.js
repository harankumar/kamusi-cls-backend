var express = require('express');
var app = express();

app.get("/", function (request, response) {
  response.send(JSON.stringify({"langs":getLangs(request)}));
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});



function getLangs(request){
  return request.header('Accept-Language');
                .split(',')
                .map(function (clause) {
                    return cldrToISO6933(clause.split(';')[0]);
                });
}

function cldrToISO6933(cldr){
  return cldr;
}