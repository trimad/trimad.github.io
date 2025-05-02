---
author: Tristan Madden
categories: [JavaScript, Python]
date: 2023-02-15
lastmod: 2023-04-14
summary: I've notice that a lot of phishing emails use hexadecimal strings to obfuscate their JavaScript. These are some Python scripts useful for identifying where form actions are POSTing to. 
tags: [phishing]
title: Decode Phishing Emails
thumbnail: "thumbnail.png"
toc: true
usePageBundles: true
---

## atob() obfuscation

This p5.js script is designed to find and decode base64-encoded strings that are nested within one another. The script has several functions that work together to achieve this goal:

`isBase64(str)`: This function checks if a given string str is a valid base64-encoded string. It uses a regular expression to test the string and the `atob()` function to try decoding the string. If the decoding is successful, the function returns true; otherwise, it returns false.

`decode(str)`: This function takes a string str and trims any single or double quotes from the beginning and end of the string. Then, if the trimmed string is a valid base64-encoded string, it decodes the string using the `atob()` function and returns the decoded string; otherwise, it returns null.

`repeatedlyDecode(str)`: This function recursively decodes any base64-encoded strings found within the given string str. It first checks if str is a valid base64-encoded string. If it is, the function decodes the string and then uses a regular expression to find any substrings that are surrounded by single or double quotes. The function then adds these quoted substrings to the matches array along with their decoded values and recursively calls the `repeatedlyDecode()` function for each of these quoted substrings.

```JavaScript
let input =
  "";

let matches = [];

function setup() {
  noLoop();
  isBase64(input);
  repeatedlyDecode(input);
  print(matches);
}

function draw() {
  background(220);
}

function repeatedlyDecode(str) {
  if (isBase64(str)) {
    const decoded = atob(str);
    const regex = /(['"])(?:(?=(\\?))\2.)*?\1/g; // regex to match quoted substrings
    let match;
    while ((match = regex.exec(decoded)) !== null) {
      //print(match)
      matches.push([match[0],decode(match[0])]); // add the match to the array of matches
      repeatedlyDecode(decode(match[0]));
    }
  }
}

function decode(str) {
  if (typeof str !== 'string') {
    return null;
  }
  // trim single or double quotes from beginning and end of str
  str = str.replace(/^['"]|['"]$/g, '');
  if (isBase64(str)) {
    return atob(str);
  }
  return null;
}


function isBase64(str) {
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  if (!base64Regex.test(str)) {
    return false;
  }
  try {
    const decoded = atob(str);
    return true;
  } catch (e) {
    return false;
  }
}

```

## HEX strings

In this program, the `re` module is used to perform regular expression matching and replacement. The decode_hex function is defined to take a regular expression match object as input, extract the hexadecimal string from the match, decode it to regular ASCII characters, and return the decoded string.

The with statement is used to open the input.html file and read its contents into the content variable. The `re.sub` function is then used to replace all occurrences of the regular expression `r'\\x[0-9a-fA-F]{2}'` with the result of calling the `decode_hex` function on each match. This regular expression matches any sequence of characters that starts with \\x and is followed by two hexadecimal digits.

The resulting decoded content is written to an output.html file using the open function and the 'w' write mode.

Note that this program assumes that the input HTML file contains only hexadecimal representations of ASCII characters that are encoded using the \\x notation. If there are other types of encodings present in the file, they will not be handled by this program.

```Python
import re

def decode_hex(match):
    hex_str = match.group(0)[2:]
    decoded = bytes.fromhex(hex_str).decode('ascii')
    return decoded

with open('input.html', 'r') as file:
    content = file.read()
    decoded_content = re.sub(r'\\x[0-9a-fA-F]{2}', decode_hex, content)

with open('output.html', 'w') as file:
    file.write(decoded_content)
```

## URI-encoded

This script defines a custom function called `url_decode()` that takes a URL-encoded string as input and returns the decoded string. The `url_decode()` function uses a while loop to iterate through the input string character by character. If a percent sign is encountered, the function uses the `int()` function to convert the following two characters to a hexadecimal value, and then uses the `chr()` function to convert the hexadecimal value to an ASCII character. If there is an invalid literal for `int()`, the function simply adds the three characters to the output string as-is. The `url_decode()` function then returns the decoded string.

The rest of the script is similar to the previous example. It loads the input HTML file, decodes the URL-encoded characters using the `url_decode()` function, and writes the decoded HTML to a new file named decoded.html. Note that this script also assumes that the input HTML file is named output.html and is in the same directory as the Python script. You may need to adjust the file paths in the script to match your specific use case.

```Python
# Custom function to decode URL-encoded characters
def url_decode(string):
    i = 0
    result = ""
    while i < len(string):
        if string[i] == '%':
            try:
                result += chr(int(string[i+1:i+3], 16))
                i += 3
            except ValueError:
                result += string[i:i+3]
                i += 3
        else:
            result += string[i]
            i += 1
    return result

# Load the input HTML file
with open('output.html', 'r') as input_file:
    html = input_file.read()

# Decode the URL-encoded characters
decoded_html = url_decode(html)

# Write the decoded HTML to a new file
with open('decoded.html', 'w') as output_file:
    output_file.write(decoded_html)

```