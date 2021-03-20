import express from 'express';
import md5 from 'md5';
import axios from 'axios'
import {RedisClient} from 'redis'

const app = express();
const PORT = 4000;
const MARVEL_PUBLIC_KEY = '76d403d5fe8da085131b25ca6462a968';
const MARVEL_PRIVATE_KEY = '886c2f1cdb35a4436c7d5ca59ed8ef31db0efd2d';

const redisClient = new RedisClient({
  port: 6379, 
  host: 'redis'
});

app.listen(PORT, () => {
  console.log(`Aplicação escutando na porta ${PORT}`);
});

app.get("/hero", (req: express.Request, res: express.Response) => {
  let ts = ticks()
  let hash =  hashMd5(ts, MARVEL_PUBLIC_KEY, MARVEL_PRIVATE_KEY );
  let uri = `http://gateway.marvel.com/v1/public/characters?ts=${ts}&apikey=${MARVEL_PUBLIC_KEY}&hash=${hash}&limit=100`
 
redisGet(`hero`, function (data) {
  if(data == null){
      axios.get(uri)
        .then(response => { 
          let array = [];
            for (let item of response.data.data.results) {
                  var hero = {
                  name: item.name,
                  descripition: item.description,
                  imageUrl: item.thumbnail.path + "." + item.thumbnail.extension,
                  wikiUrl: item.urls[1].url
                  }
            array.push(hero)
            redisSet(`hero/${item.name}`, hero)
          }
          redisSet(`hero`, array)
          res.json(array);
        })
        .catch(error => {
          console.log(error);
          res.json(
            error
             );
            });
  }
  else{
    res.json(data);
  }
  });
});

app.get("/hero/:name", (req: express.Request, res: express.Response) => {
  const { name } = req.params;
  let ts = ticks()
  let hash =  hashMd5(ts, MARVEL_PUBLIC_KEY, MARVEL_PRIVATE_KEY );
  let uri = `http://gateway.marvel.com/v1/public/characters?ts=${ts}&apikey=${MARVEL_PUBLIC_KEY}&hash=${hash}&name=${name}`
 
  redisGet(`hero/${name}`, function (data) {
    if(data == null) {    
      axios.get(uri)
      .then(response => {   
        var result = response.data.data.results[0];
        var hero = {
          name: result.name,
          descripition : result.description,
          imageUrl: result.thumbnail.path + "." + result.thumbnail.extension,
          wikiUrl: result.urls[1].url
        };
        redisSet(`hero/${result.name}`, hero)
        res.json(hero);        
      })
      .catch(error => {
        console.log(error);
        res.json(
          error
        );
      });
    }
    else {
      data.fromCache = true;
      res.json(data);
    } 
  });  
});
 
let ticks = function() {
  var d = new Date(); 
  var dStart = new Date(1970, 1, 1);
  return ((d.getTime() - dStart.getTime()) * 10000);
}

let hashMd5 = function(ts, publicKey, privateKey){
  return md5(ts + privateKey + publicKey);
}

let redisSet= function(key, data){
  let obj = null;
  redisClient.get(key, (err, value) => {
      if (value == undefined) {
          redisClient.set(key, JSON.stringify(data), (err) => {
            if(err){
                console.log(err);
            }
          });
      }
      obj = JSON.parse(value);
  });
  return obj;
}

let redisGet = function(key, callback){ 
  redisClient.get(key, (err, value) => {
    if (value != undefined) {
      callback(JSON.parse(value)); 
    } 
    else{
      callback(null)
    }     
  });
}