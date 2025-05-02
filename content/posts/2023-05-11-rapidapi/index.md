---
author: Tristan Madden
categories: [JavaScript, nodejs]
date: 2023-05-11
draft: false
summary: This program loads comma-separated stock symbols from a file named `symbols.txt` and then queries the Yahoo Finance API using a RapidAPI endpoint. It retrieves prices for every 60 minutes on a max time window. 
tags: [stocks, finance]
thumbnail: "thumbnail.png"
title: Yahoo Finance API via RapidAPI 
toc: true
usePageBundles: true
---
This program loads comma-separated stock symbols from a file named `symbols.txt` and then queries the Yahoo Finance API using a RapidAPI endpoint. It retrieves prices for every 60 minutes on a max time window. 

## Prerequisites

### Node.js

<a href="https://nodejs.org/en/download" title="https://nodejs.org/en/download">https://nodejs.org/en/download</a>

### RapidAPI API key

<a href="https://rapidapi.com/auth/sign-up" title="https://rapidapi.com/auth/sign-up">https://rapidapi.com/auth/sign-up</a>

## Program

```JavaScript
const unirest = require('unirest');
const fs = require('fs');

// Function to add a delay
function delay(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

fs.readFile('symbols.txt', 'utf8', async (err, data) => {
    if (err) throw err;
    const symbols = data.split(",");
    for (let symbol of symbols) {
        const req = unirest('GET', 'https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v2/get-chart');
        req.query({
            interval: '60m',
            symbol: symbol,
            range: 'max',
            region: 'US'
        });

        req.headers({
            'X-RapidAPI-Key': '',
            'X-RapidAPI-Host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
        });

        req.end(function (res) {
            if (res.error) throw new Error(res.error);
            
            fs.writeFile(`data/${symbol}.json`, JSON.stringify(res.body, null, 2), err => {
                if (err) throw err;
                console.log(`Saved data for ${symbol}`);
            });
        });

        // Wait for 10 seconds before the next API call
        await delay(10000);
    }
});

```