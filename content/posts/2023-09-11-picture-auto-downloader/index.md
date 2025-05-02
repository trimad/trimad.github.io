---
title: Gmail Photo Downloader
author: Tristan Madden
categories: [JavaScript]
tags: [Google Apps Script]
date: 2023-09-11
usePageBundles: true
thumbnail: "thumbnail.png"
summary: This is a Google Apps Script I wrote that automatically downloads pictures embedded in a daily email I receive from my son's daycare to a Google Drive folder.
---

This is a Google Apps Script I wrote that automatically downloads pictures embedded in a daily email I receive from my son's daycare to a Google Drive folder. 

```JavaScript
function saveLatestExternalImagesFromEmail() {
  var query = 'from:connect-notification@constoso.com';
  var threads = GmailApp.search(query, 0, 1);  // Get only the most recent thread
  
  if (threads.length === 0) {
    console.log("No new threads found.");
    return;
  }

  console.log("Processing the latest thread.");

  var folderName = 'Daycare';
  var folders = DriveApp.getFoldersByName(folderName);
  var folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }
  
  var messages = threads[0].getMessages();
  for (var j = 0; j < messages.length; j++) {
    var body = messages[j].getBody();
    
    // Extracting and formatting the date from the Gmail message
    var date = messages[j].getDate();
    var formattedDate = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    // Using the HTML service to parse
    var output = HtmlService.createHtmlOutput(body);
    var imgs = output.getContent().match(/<img [^>]*src="[^"]*"[^>]*>/g) || [];
    
    imgs.forEach(function(imgTag, index) {
      if (imgTag.includes('alt="Photo"')) {  // Check for the desired attribute
        var match = imgTag.match(/src="([^"]*)"/);
        if (match && match[1]) {
          var imageUrl = match[1];
          
          Logger.log("Found Image URL: " + imageUrl);
          try {
            var blob = UrlFetchApp.fetch(imageUrl).getBlob();
            blob.setName(formattedDate + "_Image_" + j + "_0_" + index + ".jpg");  // As it's the latest thread, we're considering the index as 0.
            folder.createFile(blob);
            Logger.log("Saved Image: " + imageUrl);
          } catch (e) {
            Logger.log("Error fetching " + imageUrl + ". Error: " + e.toString());
          }
        }
      }
    });
  }
}
```

## Example Image tag
For context, here's how the image tag looks in the daycare email:
```html
<img alt="Photo" border="0" title="Photo" width="100%" src="https://ci3.googleusercontent.com/proxy/L1Bhkyu1CzMzbd_mVCr3YwEPxKZhmzyce3uAkFuwTq1Fco1msKzwi270_a4_gnUBGJCl_1Yx9ZL4E7I76YQXE_xqbKjepm0AGiPbcT4HxYatKGdluYUqZehMEly5Y_cLpQylyC_YWORwY-pOhXa28n0Vsztq_XxMTuuj1PlXLc_N8UiBnW1JfT5Ydm6VofcibFcZhDqzwfdof9XXRRL7AA585lrxnpMU_8xpXFcVY61syua5YzBGkU7XMDtheRVpbysYLzvf1jTeMg7V4NaBVhf-ac4fNqkfiKdYhcCZC_0oNY-i_rvZmqUboioMK-yJcQKjmwVmUgNnLbfeTwNXbOE=s0-d-e1-ft#https://private.kinderlime.com/profile_pics/files/2f791232-d5f1-44c3-ab14-437643988c23/profilepic_1997707fb0462088434fe6e1b5c79a7f03d85ae0fe669997a2ca0dd912bb85d841/main/img_cropped7753123271202479858.jpg_1694105215459_photo.jpg?1694109217" class="CToWUd a6T" data-bit="iit" tabindex="0">
```
The script specifically looks for image tags with alt="Photo" to ensure we're only downloading relevant images.