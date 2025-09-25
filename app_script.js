var CHANNEL_TOKEN = "ใส่ Token ID bot";
var GDRIVE_FOLDER_FILE_ID = "ใส่ลิงค์โฟล์เดอร์ที่เก็บไฟล์";
var GDRIVE_FOLDER_IMAGE_ID = "ใส่ลิงค์โฟล์เดอร์ไว้เก็บรูป";
var GDRIVE_FOLDER_VIDEO_ID = "ใส่ลิงค์โฟล์เดอร์ไว้เก็บไฟล์วิดีโอ";
var GDRIVE_FOLDER_AUDIO_ID = "ใส่ลิงค์โฟล์เดอร์ไว้เก็บไฟล์เสียง";

//เปลี่ยนชื่อตามโฟล์เดอร์ที่สร้าง
var folderMap = {
  "File_Video": GDRIVE_FOLDER_VIDEO_ID,
  "File_Photo": GDRIVE_FOLDER_IMAGE_ID,
  "File_Sound": GDRIVE_FOLDER_AUDIO_ID,
  "File_File": GDRIVE_FOLDER_FILE_ID
};
//เปลี่ยนชื่อไฟล์ให้เหมือนกัน FV พวกนี้คือไอดีหน้าไฟล์ที่เราเรียกดู
var prefixMap = {
  "File_Video": "FV",
  "File_Image": "FP",
  "File_Audio": "FS",
  "File_File": "FL"
};
//ตัวนี้คือกันไว้เวลาเราพิมตัวเล็ก
var userFolderMap = {
  "photo": "File_Image",
  "video": "File_Video",
  "sound": "File_Audio",
  "file": "File_All"
};

var FILES_PER_PAGE = 10;

// ================== doPost รวม ==================
// =================== MAIN POST ===================
function doPost(e) {
  try {
    var value = JSON.parse(e.postData.contents);
    var event = value.events[0];
    var type = event.type;
    var replyToken = event.replyToken;
    var userId = event.source.userId;
    var userProfile = getUserProfile(userId);
    var displayName = userProfile.displayName;

    // -------- CASE MESSAGE --------
    if (type === "message") {
      var messageType = event.message.type;
      var replyMessage = [];

      if (messageType === "text") {
        var userMessage = event.message.text.trim();

        // Help Command
        if (userMessage.toLowerCase() === "help") {
          var helpFlex = {
            type: "flex",
            altText: "📖 คำสั่งช่วยเหลือ",
            contents: {
              type: "bubble",
              size: "mega",
              body: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "คู่มือบอท",
                    weight: "bold",
                    size: "xl",
                    color: "#1DB446",
                    margin: "md"
                  },
                  { type: "text", text: "บอทนี่เป็นบอทจัดเก็บไฟล์ที่ส่งมาในไลน์เท่านั้น", size: "sm", color: "#888888", wrap: true },
                  { type: "separator", margin: "md" },
                  {
                    type: "box",
                    layout: "vertical",
                    margin: "lg",
                    spacing: "sm",
                    contents: [
                      { type: "text", text: "1. Upload", wrap: true },
                      { type: "text", text: "   ส่งไฟล์เข้าไปในแชท -> Backup", size: "sm", color: "#888888", wrap: true },
                      { type: "text", text: "2. ดูไฟล์ทั้งหมดใน [โฟลเดอร์]", wrap: true },
                      { type: "text", text: "   เช่น: ดูไฟล์ทั้งหมดใน Photo", size: "sm", color: "#888888", wrap: true },
                      { type: "text", text: "3. Help", wrap: true },
                      { type: "text", text: "   แสดงคู่มือคำสั่ง", size: "sm", color: "#888888", wrap: true }
                    ]
                  }
                ]
              }
            }
          };
          replyMsg(replyToken, [helpFlex]);
          return;
        }

        // ดูไฟล์ทั้งหมด
        if (userMessage.startsWith("ดูไฟล์ทั้งหมดใน")) {
          var folderInput = userMessage.split("ดูไฟล์ทั้งหมดใน")[1]?.trim();
          replyMsg(replyToken, listUserFilesByType(userId, folderInput, 1));
          return;
        }

        // ลบไฟล์ล่าสุด
        if (userMessage === "ลบไฟล์ล่าสุด") {
          replyMsg(replyToken, [createTextFlex(deleteLastUploadedFile(userId))]);
          return;
        }

      }

      // -------- Upload files --------
      if (messageType === "file") {
        // เรียกฟังก์ชันใหม่สำหรับไฟล์
        replyMessage = handleFileMessageWithButtons(event, displayName, userId);
      } else if (messageType === "image") {
        var link = toDrive(event.message.id, "image/jpeg", ".jpg", GDRIVE_FOLDER_IMAGE_ID, userId, displayName);
        replyMessage = [createLinkFlexMessage("🖼️ ไฟล์รูปภาพ", link, displayName)];
      } else if (messageType === "video") {
        var link = toDrive(event.message.id, "video/mp4", ".mp4", GDRIVE_FOLDER_VIDEO_ID, userId, displayName);
        replyMessage = [createLinkFlexMessage("🎞️ ไฟล์วิดีโอ", link, displayName)];
      } else if (messageType === "audio") {
        var link = toDrive(event.message.id, "audio/mpeg", ".mp3", GDRIVE_FOLDER_AUDIO_ID, userId, displayName);
        replyMessage = [createLinkFlexMessage("🔊 ไฟล์เสียง", link, displayName)];
      }

      if (replyMessage.length > 0) replyMsg(replyToken, replyMessage);
    }

    // -------- CASE POSTBACK --------
    else if (type === "postback") {
      var data = event.postback.data;
      if (data.startsWith("deleteFile=")) {
        var fileId = data.split("=")[1];
        try {
          DriveApp.getFileById(fileId).setTrashed(true);
          replyMsg(replyToken, [createTextFlex("🗑️ ลบไฟล์เรียบร้อยแล้ว")]);
        } catch (e) {
          replyMsg(replyToken, [createTextFlex("❌ ไม่สามารถลบไฟล์ได้: " + e.message)]);
        }
      }
    }

  } catch (error) {
    Logger.log("Error in doPost: " + error);
  }
}

function createTextFlex(text) {
  return { type: "text", text: text };
  return {
    type: "flex",
    altText: text,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: text,
            wrap: true,
            size: "md"
          }
        ]
      }
    }
  };
}
//ข้อความตอนอัพโหลดเสร็จ
function createLinkFlexMessage(title, url, displayName) {
  return {
    type: "flex",
    altText: title + " จาก " + displayName,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: title,
            weight: "bold",
            size: "md",
            color: "#000000"
          },
          {
            type: "text",
            text: url,
            color: "#1DB446",
            size: "sm",
            wrap: true,
            action: {
              type: "uri",
              uri: url
            }
          },
          {
            type: "text",
            text: "อัปโหลดโดย : " + displayName,
            size: "xs",
            color: "#888888",
            margin: "md"
          }
        ]
      }
    }
  };
}
//ไฟล์ที่แสดงตอนพิมว่า ดูไฟล์ทั้งหมดใน .....
function createFileBubble(file, idStr, displayName) {
  var fileId = file.getId();
  var date = Utilities.formatDate(file.getDateCreated(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  return {
    type: "bubble",
    size: "micro",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "12px",
      backgroundColor: "#f8f9fa", // พื้นหลังอ่อน
      cornerRadius: "10px", // มุมโค้ง
      contents: [
        {
          type: "text",
          text: `[ID: ${idStr}] ${file.getName()}`,
          weight: "bold",
          size: "md",
          wrap: true,
          color: "#333333"
        },
        {
          type: "text",
          text: date,
          size: "xs",
          color: "#888888",
          margin: "sm"
        },
        {
          type: "button",
          style: "primary",
          color: "#4CAF50", // ปุ่มเปิดไฟล์สีเขียว
          height: "sm",
          margin: "md",
          action: {
            type: "uri",
            label: "เปิดไฟล์",
            uri: "https://drive.google.com/file/d/" + fileId + "/view"
          }
        },
        {
          type: "button",
          style: "secondary",
          color: "#FF3B30", // ปุ่มลบไฟล์สีแดง
          height: "sm",
          margin: "sm",
          action: {
            type: "postback",
            label: "ลบไฟล์นี้",
            data: "deleteFile=" + fileId
          }
        }
      ]
    }
  };
}

function listAllFilesInGivenFolderSimple(folderId) {
  try {
    var folder = DriveApp.getFolderById(folderId);
    var files = folder.getFiles();
    var fileList = [];
    var prefix = "ID";
    for (var key in folderMap) {
      if (folderMap[key] === folderId) {
        prefix = prefixMap[key];
        break;
      }
    }
    var index = 0;
    while (files.hasNext()) {
      var file = files.next();
      index++;
      var idStr = prefix + ('00' + index).slice(-3);
      fileList.push(idStr + " (" + file.getName() + ")");
    }
    return fileList;
  } catch (e) {
    return [];
  }
}

function handleFileMessage(event, displayName, userId) {
  var fileName = event.message.fileName;
  var fileType = fileName.split('.').pop().toLowerCase();
  var mimetype = getMimeType(fileType);

  if (mimetype !== "undefined") {
    var messageId = event.message.id;
    var folderId = GDRIVE_FOLDER_FILE_ID; // โฟลเดอร์หลัก

    var link = toDrive(messageId, mimetype, '.' + fileType, folderId, userId, displayName);
    var file = DriveApp.getFileById(link.split("/d/")[1].split("/view")[0]); // ดึง file object

    notifyNewUpload(fileName, file.getId(), displayName); // ส่งแจ้งเตือน
    logUploadToSheet(fileName, displayName, link);

    // ใช้ createFileBubble เพื่อสร้าง Flex card แบบปุ่มเปิด-ปุ่มลบ
    var prefix = "FL"; // สำหรับอัปโหลดใช้ FL
    return [{
      type: "flex",
      altText: "อัปโหลดไฟล์: " + fileName,
      contents: createFileBubble(file, prefix + "001", displayName) // ใส่ idStr เป็น FL001
    }];
  } else {
    return [createTextFlex('⚠️ ไม่รองรับไฟล์ประเภทนี้')];
  }
}
//แจ้งเตือนเมื่อเราลบไฟล์
function handlePostback(event) {
  var data = event.postback.data;
  var replyToken = event.replyToken;

  if (data.startsWith("deleteFile=")) {
    var fileId = data.split("deleteFile=")[1];
    try {
      DriveApp.getFileById(fileId).setTrashed(true); // ย้ายไปถังขยะ
      replyMsg(replyToken, [createTextFlex("✅ ลบไฟล์เรียบร้อยแล้ว")]);
    } catch (err) {
      replyMsg(replyToken, [createTextFlex("❌ ไม่สามารถลบไฟล์ได้: " + err.message)]);
    }
  }
}
// --- sanitize ชื่อผู้ใช้ --- สร้างโฟล์ตามชื่อ
function sanitizeName(displayName) {
  if (!displayName) return "user";
  // แทนแค่ตัวอักษรที่ Google Drive ห้ามใช้ด้วย _
  return displayName.replace(/[\/\\\:\*\?\"\<\>\|]/g, "_");
}
// --- สร้างโฟล์เดอร์ ---
function toDrive(messageId, meType, mType, parentFolderId, userId, displayName) {
  try {
    var parentFolder = DriveApp.getFolderById(parentFolderId);
    var cleanName = sanitizeName(displayName); // sanitize ชื่อผู้ใช้

    // ตรวจสอบว่าโฟลเดอร์ผู้ใช้นี้มีแล้วหรือยัง
    var userFolder = null;
    var folders = parentFolder.getFoldersByName(cleanName);
    if (folders.hasNext()) {
      userFolder = folders.next();
    } else {
      userFolder = parentFolder.createFolder(cleanName);
      Logger.log("สร้างโฟลเดอร์ใหม่สำหรับผู้ใช้: " + cleanName);
    }

    // ดึงไฟล์จาก LINE
    var url = "https://api-data.line.me/v2/bot/message/" + messageId + "/content";
    var headers = { "headers": { "Authorization": "Bearer " + CHANNEL_TOKEN } };
    var getcontent = UrlFetchApp.fetch(url, headers);
    var blob = getcontent.getBlob();
    var fileBlob = Utilities.newBlob(blob.getBytes(), meType, messageId + mType);

    // สร้างไฟล์ในโฟลเดอร์ผู้ใช้
    var file = userFolder.createFile(fileBlob);
    var fileId = file.getId();

    // เก็บ last uploaded file
    PropertiesService.getScriptProperties().setProperty("lastFile_" + userId, fileId);

    return `https://drive.google.com/file/d/${fileId}/view`;
  } catch (e) {
    Logger.log("Error toDrive: " + e);
    return null;
  }
}

function getMimeType(ext) {
  var types = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "mp4": "video/mp4",
    "mov": "video/quicktime",
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "txt": "text/plain"
  };
  return types[ext] || "undefined";
}

function notifyNewUpload(fileName, fileId, displayName) {
  var msg = {
    type: "flex",
    altText: "แจ้งอัปโหลดไฟล์ใหม่",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "มีการอัปโหลดไฟล์ใหม่",
            weight: "bold",
            size: "lg",
            color: "#00AA00"
          },
          {
            type: "text",
            text: fileName,
            wrap: true
          },
          {
            type: "text",
            text: "โดย: " + displayName,
            size: "sm",
            color: "#888888"
          },
          {
            type: "button",
            style: "link",
            action: {
              type: "uri",
              label: "เปิดดูไฟล์",
              uri: "https://drive.google.com/file/d/" + fileId + "/view"
            }
          }
        ]
      }
    }
  };
  pushMsg("YOUR_LINE_GROUP_ID", msg); // เปลี่ยนเป็น LINE Group ID ของคุณ
}

function logUploadToSheet(fileName, displayName, fileUrl) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  sheet.appendRow([new Date(), fileName, displayName, fileUrl]);
}

function deleteLastUploadedFile(userId) {
  try {
    var lastFileId = PropertiesService.getScriptProperties().getProperty("lastFile_" + userId);
    if (!lastFileId) return "❌ ไม่พบไฟล์ล่าสุดที่อัปโหลด";

    var file = DriveApp.getFileById(lastFileId);
    file.setTrashed(true);

    PropertiesService.getScriptProperties().deleteProperty("lastFile_" + userId);

    return "✅ ลบไฟล์ล่าสุดสำเร็จ";
  } catch (e) {
    Logger.log("Error deleteLastUploadedFile: " + e);
    return "❌ เกิดข้อผิดพลาดในการลบไฟล์ล่าสุด";
  }
}

function searchFilesByKeywordSafe(folderId, keyword, userId) {
  var folder = DriveApp.getFolderById(folderId);
  var userFolderName = sanitizeName(getUserProfile(userId).displayName);
  var userFolder = folder.getFoldersByName(userFolderName).hasNext()
    ? folder.getFoldersByName(userFolderName).next()
    : null;

  if (!userFolder) return [createTextFlex("❌ คุณยังไม่มีไฟล์")];

  var files = userFolder.getFiles();
  var prefix = "FL";
  for (var key in folderMap) {
    if (folderMap[key] === folderId) prefix = prefixMap[key];
  }

  var index = 0;
  var bubbles = [];
  var keywordLower = keyword.toLowerCase();
  while (files.hasNext()) {
    var file = files.next();
    var fileNameLower = file.getName().toLowerCase();
    if (fileNameLower.includes(keywordLower)) {
      index++;
      var idStr = prefix + ('00' + index).slice(-3);
      var fileId = file.getId();
      var date = Utilities.formatDate(file.getDateCreated(), Session.getScriptTimeZone(), "dd/MM/yyyy");

      bubbles.push({
        type: "bubble",
        size: "micro",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: `[ID : ${idStr}] ${file.getName()}`, weight: "bold", size: "sm", wrap: true },
            { type: "text", text: date, size: "xs", color: "#999999", margin: "xs" },
            {
              type: "button",
              style: "link",
              height: "sm",
              action: { type: "uri", label: "เปิดไฟล์", uri: "https://drive.google.com/file/d/" + fileId + "/view" }
            },
            {
              type: "button",
              style: "link",
              height: "sm",
              color: "#FF3B30",
              action: { type: "postback", label: "ลบไฟล์นี้", data: "deleteFile=" + fileId }
            }
          ]
        }
      });
    }
  }

  if (bubbles.length === 0) return [createTextFlex("❌ ไม่พบไฟล์ที่ตรงกับคำค้นหา")];
  if (bubbles.length > 10) {
    bubbles = bubbles.slice(0, 10);
    bubbles.push(createTextFlex("⚠️ แสดงผลสูงสุด 10 ไฟล์เท่านั้น"));
  }

  return [{
    type: "flex",
    altText: "ผลการค้นหาไฟล์คำว่า " + keyword,
    contents: { type: "carousel", contents: bubbles }
  }];
}

function getUserProfile(userId) {
  var url = "https://api.line.me/v2/bot/profile/" + userId;
  var headers = {
    "headers": {
      "Authorization": "Bearer " + CHANNEL_TOKEN
    },
    "method": "get",
    "muteHttpExceptions": true
  };
  try {
    var response = UrlFetchApp.fetch(url, headers);
    var result = JSON.parse(response.getContentText());
    return result;
  } catch (e) {
    Logger.log("Error getUserProfile: " + e);
    return { displayName: "ผู้ใช้" };
  }
}

function replyMsg(replyToken, messages) {
  var url = "https://api.line.me/v2/bot/message/reply";
  var payload = JSON.stringify({
    replyToken: replyToken,
    messages: messages
  });
  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + CHANNEL_TOKEN },
    payload: payload
  });
}

function pushMsg(to, message) {
  var url = "https://api.line.me/v2/bot/message/push";
  var data = {
    to: to,
    messages: [message]
  };
  var options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + CHANNEL_TOKEN
    },
    payload: JSON.stringify(data),
    muteHttpExceptions: true
  };
  UrlFetchApp.fetch(url, options);
}

function listUserFilesByType(userId, folderInput, page = 1) {
  try {
    var folderKey = userFolderMap[folderInput.toLowerCase()] || "File_All";
    var mainFolderId = folderMap[folderKey];
    var mainFolder = DriveApp.getFolderById(mainFolderId);

    var displayName = sanitizeName(getUserProfile(userId).displayName);

    var userFolder = null;
    var folders = mainFolder.getFoldersByName(displayName);
    if (folders.hasNext()) userFolder = folders.next();
    if (!userFolder) return [createTextFlex(`❌ ไม่พบไฟล์ของคุณในโฟลเดอร์ ${folderInput}`)];

    var files = [];
    var fIter = userFolder.getFiles();
    while (fIter.hasNext()) files.push(fIter.next());
    if (files.length === 0) return [createTextFlex(`❌ คุณยังไม่มีไฟล์ในโฟลเดอร์ ${folderInput}`)];

    var prefix = prefixMap[folderKey] || "ID";
    var startIndex = (page - 1) * FILES_PER_PAGE;
    var endIndex = Math.min(startIndex + FILES_PER_PAGE, files.length);
    var bubbles = [];

    for (var i = startIndex; i < endIndex; i++) {
      var idStr = prefix + ('00' + (i + 1)).slice(-3);
      bubbles.push(createFileBubble(files[i], idStr, displayName));
    }

    if (endIndex < files.length) {
      bubbles.push({
        type: "bubble",
        size: "micro",
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            { type: "text", text: "⚠️", wrap: true, color: "#FF9900", align: "center", weight: "bold", size: "lg" },
            { type: "text", text: "มากกว่า " + FILES_PER_PAGE + " ไฟล์", wrap: true, color: "#FF9900", align: "center" },
            { type: "text", text: "ดูเพิ่มเติมได้ที่", wrap: true, color: "#3399CC", align: "center" },
            { type: "text", text: "Google Drive", wrap: true, color: "#3399CC", align: "center", weight: "bold" },
            {
              type: "button",
              style: "primary", // ใช้ปุ่มสีพื้นหลัง
              height: "sm",
              color: "#34A853", // สีเขียวโทน Google
              action: {
                type: "uri",
                label: "Open Drive",
                uri: "ใส่ลิงค์โฟล์เดอร์หลักของ Google Drive" //ใส่ลิงค์ตรงนี้
              }
            }
          ]
        }
      });
    }


    return [{
      type: "flex",
      altText: "ไฟล์ทั้งหมดของคุณในโฟลเดอร์ " + folderInput,
      contents: { type: "carousel", contents: bubbles }
    }];
  } catch (e) {
    Logger.log("Error listing user files by type: " + e);
    return [createTextFlex("❌ เกิดข้อผิดพลาด: " + e.message)];
  }
}

