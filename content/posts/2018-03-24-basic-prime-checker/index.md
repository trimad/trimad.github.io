---
title: Basic Prime Checker, C++
author: Tristan Madden
categories: [C++]
tags: [prime numbers]
date: 2018-03-24
thumbnail: "thumbnail.png"
draft: false
summary: Exactly what it sounds like.
usePageBundles: true
---
Exactly what it sounds like.

```C++
#include <iostream>
#include <cmath>

using std::cout;
using std::cin;

int main() {

  int myNumber = 0;
  bool prime = true;

  //The user is prompted to input a positive integer.
  cout << "Input a positive integer: ";
  //The user inputs a positive integer.
  cin >> myNumber;

  /*
  * The program checks for special cases at the beginning to simplify the process.
  * If the number is divisible by any single-digit prime, the number is not prime.
  */
  if(myNumber == 0 || myNumber == 1){prime = false;}
  if ( myNumber > 2 && myNumber % 2 == 0 ) {prime = false;}
  if ( myNumber > 3 && myNumber % 3 == 0 ) {prime = false;}
  if ( myNumber > 5 && myNumber % 5 == 0 ) {prime = false;}
  if ( myNumber > 7 && myNumber % 7 == 0 ) {prime = false;}

  //If the number passes that test, continue checking.
  if(prime){
    /*
    *The program only needs to check up to the square root of myNumber because
    * if myNumber is not prime, it can be factored into i*i.
    */
    for (int i = sqrt(myNumber); i > 3; i--)
    {
      if(prime){
        if(myNumber % i == 0){
          prime = false;
        }
      }else{
        //No need to keep looping if we've already determined it's not prime.
        break;
      }
    }
  }

  //Feedback to the user before the program ends.
  if(prime){
    cout << myNumber << " IS prime!";
  }
  else{
    cout << myNumber << " is NOT prime!";
  }

  return 0;
}
```