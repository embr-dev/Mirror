## Mirror

![Mirror](https://socialify.git.ci/GameHub88/Mirror/image?description=1&descriptionEditable=A%20simple%20proxy%20server%20for%20the%20GameHub%20API&font=Inter&forks=1&issues=1&logo=https%3A%2F%2Fraw.githubusercontent.com%2FGameHub88%2FGameHub%2Fmain%2Fassets%2Fimg%2Flogo.png&name=1&owner=1&pattern=Floating%20Cogs&pulls=1&stargazers=1&theme=Dark)
A simple proxy server for the GameHub API

## Deploy it yourself

[![Deploy to Cyclic](https://binbashbanana.github.io/deploy-buttons/buttons/remade/cyclic.svg)](https://app.cyclic.sh/api/app/deploy/GameHub88/Mirror)
[![Deploy to Heroku](https://binbashbanana.github.io/deploy-buttons/buttons/remade/heroku.svg)](https://heroku.com/deploy/?template=https://github.com/GameHub88/Mirror)
[![Deploy to Render](https://binbashbanana.github.io/deploy-buttons/buttons/remade/render.svg)](https://render.com/deploy?repo=https://github.com/GameHub88/Mirror)
[![Run on Replit](https://binbashbanana.github.io/deploy-buttons/buttons/remade/replit.svg)](https://replit.com/github/GameHub88/Mirror)
<br>
(I would recomend using cyclic because it has fast deploy speeds and it supports custom domains.)

## Localy
If you want to run and test the server localy on your device, navigate to your console and run:

```bash
git clone https://github.com/GameHub88/Mirror.git
```
Make sure you have [nodejs](https://nodejs.org) installed for these next steps:
```bash
cd Mirror
```
```bash
npm install
```
```bash
npm start
```

then navigate on your web browser to [`localhost:2000`](http://localhost:2000) or [`127.0.0.1:2000`](http://127.0.0.1:2000) to test the server.

## API Docs

| Path            | Data                                                                                                                                                                                                | Parameters         | Method |
|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------|--------|
| /               | ```json
{status: 'ready'/'inoperable',version: version,website: website,description: 'A simple proxy server for the GameHub API',repository: 'https://github.com/GameHub88/Mirror'}```

| none               | GET    |
| /games          | ```[{thumbnail: game-thumbnail, name: game-name, id: game-id}]```|                                                                                                                       | none               | GET    |
| /games/:game-id | {<br>name: game-name,<br>url: game-url,<br>thumbnail: game-thumbnail<br>}                                                                                                                           | ?hostname=hostname | GET    |

## Contributors

![Contrib](https://contrib.rocks/image?repo=GameHub88/Mirror)
