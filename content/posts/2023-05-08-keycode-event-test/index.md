---
author: Tristan Madden
categories: [JavaScript]
date: 2023-05-08
lastmod: 2023-05-09
draft: false
featured: true
summary: "This diagnostic tool allows you to type into a text area and logs keyboard events, providing valuable information such as key codes, key names, and modifier keys (Alt, Ctrl, Shift, Meta). As you interact with the text area, the captured event data will be displayed in real-time. This can be particularly useful for debugging and understanding the nuances of keyboard events in your application."
tags: []
thumbnail: "thumbnail.png"
title: "Key Event Tester"
toc: false
usePageBundles: true
---

This diagnostic tool allows you to type into a text area and logs keyboard events, providing valuable information such as key codes, key names, and modifier keys (Alt, Ctrl, Shift, Meta). As you interact with the text area, the captured event data will be displayed in real-time. This can be particularly useful for debugging and understanding the nuances of keyboard events in your application.

{{< rawhtml >}}

<style>
        #textArea {
            width: 100%; /* Inherit the width of its parent container */
            height:100%
        }
</style>

<textarea id="textArea" rows=32 placeholder="Type here..."></textarea>

<script>
    const textArea = document.getElementById("textArea");

    function scrollToBottom() {
        textArea.scrollTop = textArea.scrollHeight;
    }

    function processKeyEvent(eventType, event) {
        event.preventDefault();
        let keyCode = event.keyCode || event.which;
        let key = event.key;
        let altKey = event.altKey ? "Alt" : "";
        let ctrlKey = event.ctrlKey ? "Ctrl" : "";
        let shiftKey = event.shiftKey ? "Shift" : "";
        let metaKey = event.metaKey ? "Meta" : "";
        let modifiers = [altKey, ctrlKey, shiftKey, metaKey].filter(Boolean).join(", ");
        textArea.value += eventType + " - KeyCode: " + keyCode + " (" + key + ")" + (modifiers ? " - Modifiers: " + modifiers : "") + "\n";
        scrollToBottom();
    }

    textArea.addEventListener("keydown", function(event) {
        processKeyEvent("KeyDown", event);
    });

    textArea.addEventListener("keyup", function(event) {
        processKeyEvent("KeyUp", event);
    });

    textArea.addEventListener("keypress", function(event) {
        processKeyEvent("KeyPress", event);
    });
</script>


{{< /rawhtml >}}


