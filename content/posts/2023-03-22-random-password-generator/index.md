---
author: Tristan Madden
categories: [JavaScript]
date: 2023-03-22
draft: false
featured: true
summary: "Randomly generated passwords. Refresh the page for new passwords."
tags: [passwords]
thumbnail: "thumbnail.png"
title: "Random Password Generator"
toc: false
usePageBundles: true
---

{{< rawhtml >}}
      <hr>
      <div id="passwords"></div>
      <hr>
      <div id="worse-passwords"></div>
      <hr>
      <div id="worser-passwords"></div>
      <hr>
{{< /rawhtml >}}
    
<script>

//Passwords
  for (let i = 0; i <= 9; i++) {
    let passwordLength = 12 + i;
let password = Array.from(crypto.getRandomValues(new Uint8Array(passwordLength))).map(byte => String.fromCharCode(33 + byte % 94)).join('');
    
    const para = document.createElement("p");
    const node = document.createTextNode(password);
    para.appendChild(node);

    const element = document.getElementById("passwords");
    element.appendChild(para);

  }
  //Worse Passwords
    for (let i = 0; i <= 9; i++) {
    let passwordLength = 12 + i;
    let password = Array.from(crypto.getRandomValues(new Uint8Array(passwordLength)))
  .map(byte => {
    const offset = byte % 62;
    if (offset < 10) {
      return String.fromCharCode(48 + offset); // 0-9
    } else if (offset < 36) {
      return String.fromCharCode(65 + offset - 10); // A-Z
    } else {
      return String.fromCharCode(97 + offset - 36); // a-z
    }
  })
  .join('');

    const para = document.createElement("p");
    const node = document.createTextNode(password);
    para.appendChild(node);

    const element = document.getElementById("worse-passwords");
    element.appendChild(para);

  }
//Worser Passwords
    for (let i = 0; i <= 9; i++) {
    let passwordLength = 12 + i;
    let password = Array.from(crypto.getRandomValues(new Uint8Array(passwordLength)))
 .map(byte => {
    const offset = byte % 52;
    if (offset < 26) {
      return String.fromCharCode(65 + offset); // A-Z
    } else {
      return String.fromCharCode(97 + offset - 26); // a-z
    }
  })
  .join('');

    const para = document.createElement("p");
    const node = document.createTextNode(password);
    para.appendChild(node);

    const element = document.getElementById("worser-passwords");
    element.appendChild(para);

  }
</script>
<!-- {{- define "page-script" -}} -->

<!-- {{- end -}} -->