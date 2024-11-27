// ==UserScript==
// @name         Skype on steroids
// @namespace    http://www.bogan.cz/skype-on-steroids/
// @version      2024-11-27-01
// @description  try to take over the Skype!
// @author       Bogan, Insidel
// @match        https://web.skype.com/
// @icon         https://secure.skypeassets.com/wcss/8-129-0-202/images/favicons/favicon.ico
// @grant        GM.addStyle
// ==/UserScript==

(function () {
  "use strict";

  let appContainer;
  let mainPanel;
  let editButton;
  let hideButton;
  let countChatButton;
  let chatListPanel;
  let openedChatTitle = null;
  let isEditing = false;
  const maxAttempts = 30;
  const originalOpen = XMLHttpRequest.prototype.open;


  setTimeout(() => {
    try {
      appContainer = document.getElementsByClassName("app-container")[0];
      mainPanel = document.createElement("div");
      mainPanel.classList.add("SONS_panel");
      createChatListContent();

      hideButton = document.createElement("a");
      hideButton.classList.add("SONS_hide_button");
      hideButton.title = "Hide";
      hideButton.innerText = "➡️";
      hideButton.href = "#";
      hideButton.addEventListener("click", hideEditor);

      editButton = document.createElement("a");
      editButton.classList.add("SONS_edit_button");
      editButton.title = "Edit";
      editButton.innerText = "✏️";
      editButton.href = "#";
      editButton.addEventListener("click", openEditor);

      countChatButton = document.createElement("a");
      countChatButton.classList.add("SONS_count_button");
      countChatButton.title = "Count";
      countChatButton.innerText = "🔄";
      countChatButton.href = "#";
      countChatButton.addEventListener("click", countUnreadedChats);

      mainPanel.appendChild(editButton);
      mainPanel.appendChild(hideButton);
      mainPanel.appendChild(countChatButton);

      document.querySelector("body").appendChild(mainPanel);

      runUnreadChatsTrigger();
      handleNotification();
    } catch (ex) {
      debugger;
    }
  }, 1500);

  setInterval(() => {
    let newChatTitle;
    try {
      newChatTitle = document.querySelector("button[title='Spravovat skupinu'],button[title='Manage group']").parentElement.closest("button[title]").getAttribute("title") || null;
    } catch (ex) {
      newChatTitle = null;
    }
    try {
      if (newChatTitle != openedChatTitle) {
        openedChatTitle = newChatTitle;
        if (!isEditing) {
          createChatListContent();
        }
      }
    } catch (ex) {
      newChatTitle = null;
    }
  }, 1000);

  function loadChatList() {
    const content = localStorage.getItem("SONS_chatlist") || "[]";
    return JSON.parse(content);
  }

  function createChatListContent() {
    try {
      mainPanel.removeChild(chatListPanel);
    } catch (ex) {}
    chatListPanel = document.createElement("div");
    chatListPanel.classList.add("SONS_chatlist");
    mainPanel.appendChild(chatListPanel);
    const chatList = loadChatList();
    for (let section of chatList) {
      createSection(section.name, section.contactList, section.collapsed);
    }
  }

  function openEditor(event) {
    try {
      event.preventDefault();
      isEditing = true;

      mainPanel.removeChild(chatListPanel);

      const editor = document.createElement("textarea");
      editor.classList.add("SONS_editor");
      mainPanel.appendChild(editor);
      editor.focus();

      const saveButton = document.createElement("button");
      saveButton.classList.add("SONS_save_button");
      saveButton.innerText = "Save";
      saveButton.addEventListener("click", saveEditor(saveButton, editor));
      mainPanel.appendChild(saveButton);

      const chatList = loadChatList();
      const lines = [];
      for (let section of chatList) {
        lines.push(section.collapsed ? `(${section.name})` : section.name);
        for (let contact of section.contactList) {
          lines.push("- " + contact);
        }
        lines.push("");
      }
      editor.value = lines.join("\n");

      editButton.style = "display:none";
    } catch (ex) {
      debugger;
    }
  }

  function hideEditor(event) {
    try {
      event.preventDefault();
      if(hideButton.innerText === "➡️") {
        hideButton.innerText = "⬅️";
        hideButton.style = "left: -15px;"
        editButton.style = "display: none;";
        appContainer.style = "padding-right: 0px";
        mainPanel.style = "width: 0px; overflow-y:unset;padding: 0 0 0 0;";
        chatListPanel.style = "display:none;";
      } else {
        hideButton.innerText = "➡️";
        hideButton.style = "left: -5px;"
        editButton.style = "display: block;";
        appContainer.style = "padding-right: 300px";
        mainPanel.style = "width: 300px; overflow-y:auto;padding: 30px 11px 20px;";
        chatListPanel.style = "display: block;";
      }

    } catch (ex) {
      debugger;
    }
  }

  function saveEditor(saveButton, editor) {
    return () => {
      try {
        const content = editor.value;
        saveButton.parentElement.removeChild(saveButton);
        editor.parentElement.removeChild(editor);
        editButton.style = "display:inline";
        const chatList = parseChatListFromText(content);
        localStorage.setItem("SONS_chatlist", JSON.stringify(chatList));
        createChatListContent();
        isEditing = false;
      } catch (ex) {
        debugger;
      }
    };
  }

  function parseChatListFromText(text) {
    const lines = text.split("\n");
    const chatList = [];
    let lastSection;

    lines.forEach((line) => {
      line = line.trim();
      if (line === "") {
        // Skip empty lines
        return;
      }

      if (line.startsWith("-") && lastSection) {
        // contact
        lastSection.contactList.push(line.slice(1).trim());
        return;
      }

      // Section name
      let collapsed = false;
      if (line.startsWith("(") && line.endsWith(")")) {
        collapsed = true;
        line = line.slice(1, -1);
      }

      lastSection = { name: line, contactList: [], collapsed };
      chatList.push(lastSection);
    });

    return chatList;
  }

  function runUnreadChatsTrigger(timeout=5000) {
      setTimeout(() => {
          countUnreadedChats();
          runUnreadChatsTrigger(60000);
      }, timeout);
  }
  function countUnreadedChats() {
      try {
          event.preventDefault();
           document.querySelectorAll('.SONS_section_count, .SONS_item_count').forEach(function(element) {
               element.remove();
           });
          const unreadedMessageList = [];
          const viewport = document.querySelector('.scrollViewport.scrollViewportV');
          if(viewport) {
              const listItems = viewport.querySelectorAll('[role="listitem"]');

              listItems.forEach(item => {
                  let ariaLabel = item.getAttribute('aria-label');
                  if (ariaLabel && ariaLabel.includes("oblíbené,")) {
                    ariaLabel = ariaLabel.replace("oblíbené,", "").trim();
                  }

                  let name = '';
                  const commaIndex = ariaLabel.indexOf(',');
                  if (commaIndex !== -1) {
                      name = ariaLabel.substring(0, commaIndex).trim();
                  }
                  const numberElement = item.querySelector('div.css-901oao');
                  const number = numberElement?.textContent?.trim();

                  if (name && number) {
                      unreadedMessageList.push({ [name]: parseInt(number, 10) });
                  }
              });
              console.log(unreadedMessageList)
              let sectionGroupCount = 0;
              document.querySelectorAll('.SONS_section').forEach(section => {
                  sectionGroupCount = 0;
                  const sectionName = section.querySelector('.SONS_section_name').textContent.trim();  //  document.querySelectorAll('.SONS_section')[0].querySelector('.SONS_section_name').textContent.trim()
                  //  document.querySelectorAll('.SONS_section')[0].querySelectorAll('.link_item')[0].textContent.trim()
                  section.querySelectorAll('.link_item').forEach(link => {
                      let linkText = link.textContent.trim();
                      //console.log("Iteruji itemy "+linkText);
                      let foundItem = null;
                      let foundUnreadedMessagesCount = 0;
                      const exists = unreadedMessageList.some(item => {
                          if(Object.keys(item).some(key => key.startsWith(linkText))) {
                              foundItem = Object.keys(item)[0];
                              foundUnreadedMessagesCount = Number(item[foundItem]);
                              return true;
                          } else {
                              return false;
                          }
                      });
                      if(exists) {
                          //console.log('Nalezl jsem shodu ' + foundItem + "("+foundUnreadedMessagesCount+")");
                          sectionGroupCount = sectionGroupCount + foundUnreadedMessagesCount;
                          if(foundUnreadedMessagesCount.toString() !== "NaN") {
                              link.insertAdjacentHTML('afterend', '<div class="SONS_item_count">'+foundUnreadedMessagesCount+'</div>');
                          }
                      }

                  });
                  //console.log("total v kategorii "+ sectionGroupCount);
                  if(sectionGroupCount > 0 && sectionGroupCount !== NaN) {
                      section.querySelectorAll('.SONS_section_name')[0].insertAdjacentHTML('afterend', '<div class="SONS_section_count">'+sectionGroupCount+'</div>');
                  }
              });

          }
      } catch (ex) {
      debugger;
    }
  }

  function goToChat(link) {
    return (event) => {
      try {
        event.preventDefault();
        openChat(link.innerText, maxAttempts);
      } catch (ex) {
        debugger;
      }
    };
  }

  async function openChat(name, attempt) {
    var element = document.querySelector("[data-text-as-pseudo-element='" + name + "']");
    if (element) {
      element.click();
      setTimeout(() => {
          countUnreadedChats();
        }, 3000);

    } else if (attempt > 0) {
      const contactPanel = document.querySelector(".scrollViewport.scrollViewportV");
      if (contactPanel) {
        let timeout = 300;
        if (attempt === maxAttempts) {
          //scroll to up by change list view
          document.querySelector('button[role="tab"][title="Kontakty"]').click();
          await new Promise(resolve => setTimeout(resolve, 300));
          document.querySelector('button[role="tab"][title="Chaty"]').click();
          await new Promise(resolve => setTimeout(resolve, 300));
          contactPanel.scrollBy(0, 10000);
        } else {
          contactPanel.scrollBy(0, 10000);
        }

        setTimeout(() => {
          openChat(name, attempt - 1);
        }, timeout);
      }
    }
  }

  function createSection(sectionName, chatNameList, collapsed) {
    const section = document.createElement("div");
    section.classList.add("SONS_section");
    collapsed && section.classList.add("SONS_collapsed");

    const name = document.createElement("a");
    name.classList.add("SONS_section_name");
    name.innerText = sectionName;
    name.addEventListener("click", () => toggleSection(section, sectionName));
    name.title = "Expand/collapse this section";

    section.appendChild(name);

    if (openedChatTitle) {
      const addToSectionLink = document.createElement("a");
      addToSectionLink.innerText = "➕";
      addToSectionLink.classList.add("SONS_add_to_section");
      addToSectionLink.href = "#";
      addToSectionLink.title = "Add current chat to this section";
      addToSectionLink.addEventListener("click", () => openSection(section, sectionName));
      addToSectionLink.addEventListener("click", addToSection(sectionName));
      section.appendChild(addToSectionLink);
    }

    // need a nesting level to avoid chat links scrolling through the text above
    const sectionChatList = document.createElement("div");
    sectionChatList.classList.add("SONS_section_chatlist");

    const sectionChatItems = document.createElement("div");
    sectionChatItems.classList.add("SONS_section_chatitems");

    for (let chatName of chatNameList) {
      createChatButton(chatName, sectionChatItems);
    }

    sectionChatList.appendChild(sectionChatItems);
    section.appendChild(sectionChatList);

    chatListPanel.appendChild(section);
    return section;
  }

  function openSection(section, sectionName) {
    section.classList.remove("SONS_collapsed");
    const chatList = loadChatList();
    const savedSection = chatList.find(({name}) => name === sectionName);

    if (!savedSection) return;

    savedSection.collapsed = false;
    localStorage.setItem("SONS_chatlist", JSON.stringify(chatList));
  }

  function toggleSection(section, sectionName) {
    section.classList.toggle("SONS_collapsed");
    const chatList = loadChatList();
    const savedSection = chatList.find(({name}) => name === sectionName);

    if (!savedSection) return;

    savedSection.collapsed = section.classList.contains("SONS_collapsed");
    localStorage.setItem("SONS_chatlist", JSON.stringify(chatList));
  }

  function addToSection(sectionName) {
    return (event) => {
      try {
        event.preventDefault();
        const chatList = loadChatList();
        const section = chatList.find(({name}) => name === sectionName);
        section.contactList.push(openedChatTitle);
        localStorage.setItem("SONS_chatlist", JSON.stringify(chatList));
        createChatListContent();
      } catch (ex) {
        debugger;
      }
    };
  }

  function createChatButton(text, section) {
    const linkWrapper = document.createElement("span");
    linkWrapper.classList.add("link_wrapper");
    const link = document.createElement("a");
    link.innerText = text;
    link.classList.add("link_item");
    link.href = "#";
    link.addEventListener("click", goToChat(link));
    linkWrapper.append(link);
    section.appendChild(linkWrapper);
  }

  function handleNotification() {
       XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        if (url.includes('/progress')) {
            this.addEventListener('load', function () {
                try {
                    console.log(Notification.permission)
                  if (Notification.permission === 'granted') {
                      new Notification('Příchozí hovor', {
                          body: 'Máte hovor na skype.'
                      });
                  } else {
                      Notification.requestPermission().then(permission => {
                          if (permission === 'granted') {
                              new Notification('Příchozí hovor', {
                                  body: 'Máte hovor na skype',
                              });
                          }
                      });
}

                    // Start blinking title
                    let originalTitle = document.title;
                    let isBlinking = false;
                    setInterval(() => {
                        if (isBlinking) {
                            document.title = originalTitle;
                        } else {
                            document.title = "📞 Příchozí hovor!";
                        }
                        isBlinking = !isBlinking;
                    }, 1000);



                } catch (e) {

                    console.error("Chyba při zpracování odpovědi:", e);
                }
            });

            this.addEventListener('error', function () {
                console.error("Došlo k chybě při zpracování požadavku.");
            });

            this.addEventListener('timeout', function () {
                console.error("Požadavek vypršel.");
            });
        }

        // Zavolání původního `open`
        originalOpen.call(this, method, url, ...rest);
    };

  }
  GM.addStyle(`
    .app-container{
      padding-right: 300px;
      background: white;
      color: #222;
    }

    .SONS_panel {
      width: 300px;
      height: 100vh;
      position: fixed;
      z-index: 1;
      right: 0;
      top: 0;
      box-shadow: 5px 0px 5px #0000000d inset;
      padding: 30px 11px 20px;
      display: flex;
      flex-direction: column;
      gap: 0.5em;
      overflow-y: auto;
    }

    @media (prefers-color-scheme: dark) {
      .SONS_panel,.app-container {
        background-color: #19191b;
        color: hsl(228, 5%, 80%);
      }

      .SONS_panel a {
        color: hsl(228, 5%, 80%);
      }

      .SONS_panel a:hover {
        color: hsl(228, 5%, 90%);
      }
    }

    .SONS_section {
      margin-top: 4px;
    }

    .SONS_section_name::before {
      content: "🡦";
      width: .9em;
      font-size: .75em;
      font-weight: normal;
      display: inline-block
    }

    .SONS_collapsed .SONS_section_name::before {
      content: ">";
    }

    .SONS_chatlist {}

    .SONS_section_chatlist {
      overflow: hidden;
      margin-top: -5px;
    }

    .SONS_section_chatitems {
      transition: all 200ms;
      margin-top: 0;
    }

    .SONS_collapsed .SONS_section_chatitems {
      margin-top: -100%;
    }

    .SONS_section_chatlist a {
      margin-left: 1.2em;
      float: left;
      display: block;
      width: 80%;
    }
    .SONS_section_chatlist a:hover {
      font-weight: bold;
    }
    .SONS_edit_button {
      position: absolute;
      right: 5px;
      top: 5px;
      opacity: 0.5;
    }
    .SONS_count_button {
      position: absolute;
      left: 10px;
      top: 5px;
      opacity: 0.5;
    }
    .SONS_hide_button {
      position: absolute;
      left: -5px;
      top: 50%;
      opacity: 1;
      cursor: pointer;
    }
    .SONS_editor {
      height: calc(100vh - 50px);
      box-shadow: 2px 2px 4px #00000033 inset;
      padding: 10px 6px;
      font-family: monospace;
      font-size: 12px;
    }
    .SONS_edit_button:hover {
      opacity: 1;
    }
    .SONS_save_button {
      position: absolute;
      right: 15px;
      top: 5px;
      font-size: 13px;
      padding: 0px 7px;
    }
    .SONS_section_name {
      font-weight: bold;
      margin-top: 5px;
      cursor: pointer;
    }
    .SONS_section_count {
      display: inline-block;
      background: blue;
      height: 19px;
      width: 19px;
      text-align: center;
      border-radius: 50%;
      color: white;
      margin-left: 5px;
      font-size: 13px;
    }
    .SONS_item_count {
      float: left;
      display: block;
    }
    a.SONS_add_to_section {
      margin-left: 5px;
      display: inline;
      opacity: 0.5;
      font-size: 80%;
    }
    a.SONS_add_to_section:hover {
      opacity: 1;
    }
    `);
})();
