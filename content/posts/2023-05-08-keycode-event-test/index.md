---
author: Tristan Madden
categories: [JavaScript]
date: 2023-05-08
draft: false
summary: "This diagnostic tool lets you type, paste, compose text, and click inside a text area to log keyboard, text input, composition, and mouse click events. It includes filter toggles, a clear-log button, and detailed metadata such as key codes, input types, button states, pointer offsets, timestamps, and modifier keys."
tags: [debugging]
title: "Key Event Tester"
toc: false
usePageBundles: false
---

This diagnostic tool lets you type, paste, compose text, and click inside a text area to log keyboard, text input, composition, and mouse click events. It captures details such as key codes, key names, input types, mouse buttons, button states, pointer position, offsets, timestamps, and modifier keys (Alt, Ctrl, Shift, Meta).

Use the filter controls to focus on keyboard, text input, composition, primary click, auxiliary click, or context menu activity. The Clear Log button resets the captured output without reloading the page.

{{< rawhtml >}}

<style>
        .event-tester-controls {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem 1rem;
            align-items: center;
            margin-bottom: 0.75rem;
            font-size: 0.95rem;
        }

        .event-tester-controls button {
            cursor: pointer;
        }

        .event-tester-controls label {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            cursor: pointer;
        }

        #textArea {
            width: 100%; /* Inherit the width of its parent container */
            height:100%;
            box-sizing: border-box;
        }
</style>

<div class="event-tester-controls">
    <button id="clearLogButton" type="button">Clear Log</button>
    <label><input id="filterKeyboard" type="checkbox" checked> Keyboard</label>
    <label><input id="filterTextInput" type="checkbox" checked> Text Input</label>
    <label><input id="filterComposition" type="checkbox" checked> Composition</label>
    <label><input id="filterPrimaryClick" type="checkbox" checked> Primary Click</label>
    <label><input id="filterAuxClick" type="checkbox" checked> Aux Click</label>
    <label><input id="filterContextMenu" type="checkbox" checked> Context Menu</label>
</div>

<textarea id="textArea" rows=32 placeholder="Type, paste, compose, or click here..." spellcheck="false"></textarea>

<script>
    const textArea = document.getElementById("textArea");
    const clearLogButton = document.getElementById("clearLogButton");
    const filterInputs = {
        keyboard: document.getElementById("filterKeyboard"),
        textInput: document.getElementById("filterTextInput"),
        composition: document.getElementById("filterComposition"),
        primaryClick: document.getElementById("filterPrimaryClick"),
        auxClick: document.getElementById("filterAuxClick"),
        contextMenu: document.getElementById("filterContextMenu")
    };
    const logEntries = [];
    const keyEventLabels = {
        keydown: "KeyDown",
        keyup: "KeyUp"
    };
    const textInputEventLabels = {
        beforeinput: "BeforeInput",
        input: "Input"
    };
    const compositionEventLabels = {
        compositionstart: "CompositionStart",
        compositionupdate: "CompositionUpdate",
        compositionend: "CompositionEnd"
    };
    const mouseEvents = {
        click: {
            label: "Click",
            filter: "primaryClick"
        },
        dblclick: {
            label: "DoubleClick",
            filter: "primaryClick"
        },
        auxclick: {
            label: "AuxClick",
            filter: "auxClick"
        },
        contextmenu: {
            label: "ContextMenu",
            filter: "contextMenu"
        }
    };

    function scrollToBottom() {
        textArea.scrollTop = textArea.scrollHeight;
    }

    function renderLog() {
        textArea.value = logEntries.join("\n");

        if (document.activeElement === textArea) {
            textArea.setSelectionRange(textArea.value.length, textArea.value.length);
        }

        scrollToBottom();
    }

    function recordEvent(filterName, message) {
        if (filterInputs[filterName].checked) {
            logEntries.push(message);
        }

        renderLog();
    }

    function formatLogEntry(eventType, details) {
        return [eventType].concat(details.filter(Boolean)).join(" - ");
    }

    function getModifiers(event) {
        let altKey = event.altKey ? "Alt" : "";
        let ctrlKey = event.ctrlKey ? "Ctrl" : "";
        let shiftKey = event.shiftKey ? "Shift" : "";
        let metaKey = event.metaKey ? "Meta" : "";
        return [altKey, ctrlKey, shiftKey, metaKey].filter(Boolean).join(", ");
    }

    function formatTimeStamp(event) {
        return Math.round(event.timeStamp) + "ms";
    }

    function getLegacyKeyCode(event) {
        return event.keyCode || event.which || 0;
    }

    function getKeyLocationName(location) {
        const locationMap = {
            0: "Standard",
            1: "Left",
            2: "Right",
            3: "Numpad"
        };

        return locationMap[location] || "Unknown";
    }

    function formatTextValue(value) {
        if (value === null || value === undefined || value === "") {
            return "n/a";
        }

        return JSON.stringify(value);
    }

    function processKeyEvent(eventType, event) {
        let modifiers = getModifiers(event);
        recordEvent(
            "keyboard",
            formatLogEntry(eventType, [
                "KeyCode: " + getLegacyKeyCode(event),
                "Key: " + formatTextValue(event.key),
                "Code: " + (event.code || "n/a"),
                "Location: " + getKeyLocationName(event.location) + " (" + event.location + ")",
                "Repeat: " + event.repeat,
                modifiers ? "Modifiers: " + modifiers : "",
                "Time: " + formatTimeStamp(event)
            ])
        );
    }

    function processTextInputEvent(eventType, event) {
        let modifiers = getModifiers(event);
        recordEvent(
            "textInput",
            formatLogEntry(eventType, [
                "InputType: " + (event.inputType || "n/a"),
                "Data: " + formatTextValue(event.data),
                "IsComposing: " + Boolean(event.isComposing),
                modifiers ? "Modifiers: " + modifiers : "",
                "Time: " + formatTimeStamp(event)
            ])
        );
    }

    function getMouseButtonName(button) {
        const buttonMap = {
            0: "Left",
            1: "Middle",
            2: "Right",
            3: "Back",
            4: "Forward"
        };

        return buttonMap[button] || "Unknown";
    }

    function processCompositionEvent(eventType, event) {
        recordEvent(
            "composition",
            formatLogEntry(eventType, [
                "Data: " + formatTextValue(event.data),
                typeof event.isComposing === "boolean" ? "IsComposing: " + event.isComposing : "",
                "Time: " + formatTimeStamp(event)
            ])
        );
    }

    function processMouseEvent(eventType, filterName, event) {
        let modifiers = getModifiers(event);
        recordEvent(
            filterName,
            formatLogEntry(eventType, [
                "Button: " + getMouseButtonName(event.button) + " (" + event.button + ")",
                "Buttons: " + event.buttons,
                "Position: " + event.clientX + ", " + event.clientY,
                "Offset: " + event.offsetX + ", " + event.offsetY,
                "Detail: " + event.detail,
                modifiers ? "Modifiers: " + modifiers : "",
                "Time: " + formatTimeStamp(event)
            ])
        );
    }

    Object.keys(keyEventLabels).forEach(function(eventName) {
        textArea.addEventListener(eventName, function(event) {
            processKeyEvent(keyEventLabels[eventName], event);
        });
    });

    Object.keys(textInputEventLabels).forEach(function(eventName) {
        textArea.addEventListener(eventName, function(event) {
            processTextInputEvent(textInputEventLabels[eventName], event);
        });
    });

    Object.keys(compositionEventLabels).forEach(function(eventName) {
        textArea.addEventListener(eventName, function(event) {
            processCompositionEvent(compositionEventLabels[eventName], event);
        });
    });

    Object.keys(mouseEvents).forEach(function(eventName) {
        textArea.addEventListener(eventName, function(event) {
            processMouseEvent(mouseEvents[eventName].label, mouseEvents[eventName].filter, event);
        });
    });

    clearLogButton.addEventListener("click", function() {
        logEntries.length = 0;
        renderLog();
        textArea.focus();
    });
</script>


{{< /rawhtml >}}

## Change Log

- 2026-03-25: Added filter toggles for keyboard, text input, composition, primary click, auxiliary click, and context menu activity, plus a `Clear Log` button.
- 2026-03-25: Replaced deprecated `keypress` coverage with `beforeinput`, `input`, and composition event logging for modern text entry and IME testing.
- 2026-03-25: Expanded the logged metadata to include input types, key locations, repeat state, button states, offsets, click detail, timestamps, and modifier keys.
- 2026-03-25: Updated the summary, description, and prompt text to reflect the broader input-event coverage.


