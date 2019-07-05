"use strict";

import ImageDataController from "./ImageDataController.js";

const FILL_SIZE = 200;
let provinceMap = null, politicalMap = null;
let nx = 0, ny = 0, lastX = 0, lastY = 0, mapX = -2500, mapY = -300, myCountryColor = [255, 255, 255], annexMode = 0, pLastTime = 0, cLastTime = 0, myCountryId = null, targetCountryId = null;

onload = () => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext('2d');
    const map = document.getElementById("map");
    canvas.width = map.width;
    canvas.height = map.height;
    ctx.drawImage(map, 0, 0, map.width, map.height);
    provinceMap = new ImageDataController(ctx.getImageData(0, 0, map.width, map.height));
    ctx.drawImage(document.getElementById("whiteMap"), 0, 0, map.width, map.height);
    politicalMap = new ImageDataController(ctx.getImageData(0, 0, map.width, map.height));
    canvas.width = 960;
    canvas.height = 540;
    canvas.addEventListener("click", fillstart, false);
    canvas.addEventListener("mousedown", mdown, false);
    canvas.addEventListener("touchstart", mdown, false);
    document.getElementById("color").value = "#" + Math.floor(Math.random() * 256).toString(16) + Math.floor(Math.random() * 256).toString(16) + Math.floor(Math.random() * 256).toString(16);

    //地図初期化
    pLastTime = now();
    cLastTime = now();
    for (const i of sqlRequest("SELECT x,y,country.r,country.g,country.b FROM province INNER JOIN country ON province.countryId=country.countryId")) {
        fFill(parseInt(i.x), parseInt(i.y), parseInt(i.r), parseInt(i.g), parseInt(i.b));
    }
    ctx.putImageData(politicalMap.imageData, mapX, mapY);

    //マルチスレッド実験
    // Workerスクリプトへのバスを引数にWorkerインスタンスを生成します
    var worker = new Worker('worker.js');
    // データをWorkerスレッドに送り処理を開始させます
    worker.postMessage(politicalMap.data);
    worker.onmessage = function (e) {
        console.log(e);
    };

    setInterval(() => {
        //地図更新
        let responce = sqlRequest("SELECT x,y,r,g,b FROM (SELECT x,y,countryId FROM province where timestamp>" + pLastTime + " ORDER BY timestamp DESC) AS province2 INNER JOIN country ON province2.countryId=country.countryId");
        if (responce.length >= 1) { //プロヴィンスに関して更新があったら
            if (responce.length > -1) pLastTime = now(); //responceと無理やり同期させる
            console.log(responce);
            for (const i of responce) {
                fFill(parseInt(i.x), parseInt(i.y), parseInt(i.r), parseInt(i.g), parseInt(i.b));
            }
            ctx.putImageData(politicalMap.imageData, mapX, mapY);
        }

        //国情報更新
        if (myCountryId != null) { //自国が選択済みならば            
            const responce = sqlRequest("SELECT money FROM country WHERE countryId=" + myCountryId + " AND timestamp>" + cLastTime);
            if (responce.length < 1) return;
            if (responce.length > -1) cLastTime = now(); //responceと無理やり同期させる
            console.log(responce);
            for (const i of responce) {
                document.getElementById("money").innerText = i.money;
            }
        }
    }, 1500);


    function fillstart(e) {
        let [r, g, b] = provinceMap.getColor(lastX, lastY);
        console.log(r, g, b);
        [r, g, b] = getOwnerRGB(r, g, b);
        fFill(lastX, lastY, r, g, b);
        lastX = e.offsetX - mapX;
        lastY = e.offsetY - mapY;
        fFill(lastX, lastY, 255, 0, 0);
        ctx.putImageData(politicalMap.imageData, mapX, mapY);
        if (annexMode == 1) annexProvince();
        [r, g, b] = provinceMap.getColor(lastX, lastY);
        [r, g, b] = getOwnerRGB(r, g, b);
        document.getElementById("targetCountryFlag").src = "img/" + r + "." + g + "." + b + ".png";
        document.getElementById("targetCountryName").innerText = getOwnerName(r, g, b);
        targetCountryId = getCountryId(r, g, b);
    }

    function mdown(e) {
        if (e.type === "mousedown") {
            var event = e;
        } else {
            var event = e.changedTouches[0];
        }

        //要素内の相対座標を取得
        nx = event.offsetX;
        ny = event.offsetY;

        //ムーブイベントにコールバック
        document.body.addEventListener("mousemove", mmove, false);
        document.body.addEventListener("touchmove", mmove, false);
        canvas.addEventListener("mouseup", mup, false);
        document.body.addEventListener("mouseleave", mup, false);
        canvas.addEventListener("touchend", mup, false);
        document.body.addEventListener("touchleave", mup, false);
    }

    //マウスカーソルが動いたときに発火
    function mmove(e) {
        //同様にマウスとタッチの差異を吸収
        if (e.type === "mousemove") {
            var event = e;
        } else {
            var event = e.changedTouches[0];
        }

        //フリックしたときに画面を動かさないようにデフォルト動作を抑制
        e.preventDefault();

        //マウスが動いた場所に要素を動かす
        mapX += event.offsetX - nx;
        mapY += event.offsetY - ny;
        if (mapX > 0) mapX = 0;
        else if (mapX - canvas.width < -1 * map.width) mapX = -1 * map.width + canvas.width;
        if (mapY > 0) mapY = 0;
        else if (mapY - canvas.height < -1 * map.height) mapY = -1 * map.height + canvas.height;
        ctx.putImageData(politicalMap.imageData, mapX, mapY);
        nx = event.offsetX;
        ny = event.offsetY;
    }

    //マウスボタンが上がったら発火
    function mup(e) {
        //ムーブベントハンドラの消去
        document.body.removeEventListener("mousemove", mmove, false);
        canvas.removeEventListener("mouseup", mup, false);
        document.body.removeEventListener("touchmove", mmove, false);
        canvas.removeEventListener("touchend", mup, false);
    }
}

//古い関数です スタックオーバーフローします
/*
function fill(x, y, nr, ng, nb, or, og, ob) {
    const en = toprovinceMap.imageDataElem(x, y);
    if (politicalMap.imageData.data[en] != or || politicalMap.imageData.data[en + 1] != og || politicalMap.imageData.data[en + 2] != ob) return;
    politicalMap.imageData.data[en] = nr;
    politicalMap.imageData.data[en + 1] = ng;
    politicalMap.imageData.data[en + 2] = nb;
    fill(x + 1, y, nr, ng, nb, or, og, ob);
    fill(x, y + 1, nr, ng, nb, or, og, ob);
    fill(x - 1, y, nr, ng, nb, or, og, ob);
    fill(x, y - 1, nr, ng, nb, or, og, ob);
}*/

function fFill(x, y, r, g, b) {
    const [opr, opg, opb] = provinceMap.getColor(x, y);
    if (opr == 0 && opg == 0 && opb == 0) return; //線を選択したら戻る
    //console.log(wmr + "," + wmg + "," + wmb);
    for (let ty = y - FILL_SIZE; ty < y + FILL_SIZE; ty++) {
        for (let tx = x - FILL_SIZE; tx < x + FILL_SIZE; tx++) {
            if (provinceMap.checkColor(tx, ty, opr, opg, opb)) {
                politicalMap.setColor(tx, ty, r, g, b);
            }
        }
    }
}

function createCountry() {
    const color = document.getElementById("color").value;
    const r = parseInt(color.substring(1, 3), 16);
    const g = parseInt(color.substring(3, 5), 16);
    const b = parseInt(color.substring(5, 7), 16);
    if (sqlRequest("SELECT * FROM country WHERE r=" + r + " AND g=" + g + " AND b=" + b).length > 0) {
        alert("同じ色を使用している国家が既に存在します");
        return;
    }
    const [pr, pg, pb] = provinceMap.getColor(nx - mapX, ny - mapY);
    if (pr == 0 && pg == 0 && pb == 0) {
        alert("国境線です");
        return;
    }
    if (isOwned(pr, pg, pb)) {
        alert("そのプロヴィンスは既に領有されています");
        return;
    }
    sqlRequest("INSERT INTO `country` (`name`, `r`, `g`, `b`, `money`, `timestamp`) VALUES ('" + document.getElementById("mcName").value + "', " + r + ", " + g + ", " + b + " , 0, NOW())");
    myCountryId = sqlRequest("SELECT countryId from country order by countryId desc limit 1")[0].countryId; //最新のidを取得
    annexProvince();
    fFill(nx - mapX, ny - mapY, r, g, b);
    ctx.putImageData(politicalMap.imageData, mapX, mapY);
    selectCountry();
}

function selectCountry() {
    let [r, g, b] = provinceMap.getColor(nx - mapX, ny - mapY); //選択しているプロヴィンスのRGBを取得
    [r, g, b] = getOwnerRGB(r, g, b);
    const name = getOwnerName(r, g, b);
    if (name === "領有国なし") return;
    document.getElementById("text").innerText = "外交の時間だ！"
    document.getElementById("myCountryFlag").src = "img/" + r + "." + g + "." + b + ".png";
    myCountryColor = [r, g, b];
    document.getElementById("myCountryName").innerText = name;
    document.getElementById("money").innerText = getMoney(r, g, b);
    myCountryId = getCountryId(r, g, b);
    document.getElementById("military").innerText = sqlRequest("SELECT military FROM country WHERE countryId=" + myCountryId)[0].military;
    document.getElementById("expandArmy").disabled = false;
    document.getElementById("disarm").disabled = false;
}

function annexProvince() { //選択しているマスを選択している国で併合します
    if (myCountryId == null) return;

    const [pr, pg, pb] = provinceMap.getColor(nx - mapX, ny - mapY);
    if (pr == 0 && pg == 0 && pb == 0) {
        alert("国境線です");
        return;
    }
    if (isOwned(pr, pg, pb)) {
        sqlRequest("UPDATE province SET countryId=" + myCountryId + ",timestamp=NOW() WHERE r=" + pr + " AND g=" + pg + " AND b=" + pb);
    } else {
        sqlRequest("INSERT INTO `province` (`x`, `y`, `r`, `g`, `b`, `timestamp`, `countryId`) VALUES (" + (nx - mapX) + ", " + (ny - mapY) + ", " + pr + ", " + pg + ", " + pb + ", NOW(), " + myCountryId + ")");
    }
    fFill(nx - mapX, ny - mapY, myCountryColor[0], myCountryColor[1], myCountryColor[2]);
    ctx.putImageData(politicalMap.imageData, mapX, mapY);
}

function getOwnerRGB(r, g, b) { //プロヴィンスカラーから領有国カラーを求めます
    const responce = sqlRequest("SELECT r,g,b FROM country WHERE countryId=(SELECT countryId FROM province WHERE r=" + r + " AND g=" + g + " AND b=" + b + ")");
    if (responce.length < 1) return [255, 255, 255]; //国が見つからなかった時
    return [responce[0].r, responce[0].g, responce[0].b];
}

function getOwnerName(r, g, b) { //国カラーから領有国名を求めます
    const responce = sqlRequest("SELECT name FROM country WHERE r=" + r + " AND g=" + g + " AND b=" + b);
    if (responce.length < 1) return "領有国なし"; //国が見つからなかった時
    return responce[0].name;
}

function getMoney(r, g, b) { //国カラーから資金を求めます
    const responce = sqlRequest("SELECT money FROM country WHERE r=" + r + " AND g=" + g + " AND b=" + b);
    if (responce.length < 1) return "不明"; //国が見つからなかった時
    return parseInt(responce[0].money);
}

function getCountryId(r, g, b) { //国カラーから国IDを求めます
    const responce = sqlRequest("SELECT countryId FROM country WHERE r=" + r + " AND g=" + g + " AND b=" + b);
    if (responce.length < 1) return null; //国が見つからなかった時
    return parseInt(responce[0].countryId);
}

function isOwned(r, g, b) {
    const [or, og, ob] = getOwnerRGB(r, g, b);
    if (or == 255, og == 255, ob == 255) return false;
    return true;
}

function switchAnnexMode() {
    if (myCountryId == null) return; //国が未選択だったら何もしない
    annexMode = 1 - annexMode;
    //console.log(annexMode);
    if (annexMode === 1) {
        document.getElementById("annex").innerText = "併合中止";
        return;
    }
    document.getElementById("annex").innerText = "併合開始";
}

function expandArmy() { //軍を拡大
    let military = parseInt(document.getElementById("military").innerText);
    document.getElementById("military").innerText = ++military;
    document.getElementById("disarm").disabled = false;
    sqlRequest("UPDATE country SET timestamp=NOW(),military=" + military + " WHERE countryId=" + myCountryId);
}

function disarm() { //軍縮
    let military = parseInt(document.getElementById("military").innerText);
    if (military <= 0) {
        document.getElementById("text").innerText = "これ以上軍縮はできません";
        document.getElementById("disarm").disabled = true;
        return;
    }
    document.getElementById("military").innerText = --military;
    sqlRequest("UPDATE country SET timestamp=NOW(),military=" + military + " WHERE countryId=" + myCountryId);
}

function declareWar() { //宣戦布告
    if (myCountryId == null || targetCountryId == null || myCountryId == targetCountryId) return;
    const request = sqlRequest("SELECT * FROM war WHERE ((countryIdA='" + myCountryId + "' AND countryIdB='" + targetCountryId + "') OR (countryIdA='" + targetCountryId + "'AND countryIdB='" + myCountryId + "'))");
    console.log(request);
    if (request.length > 0) {
        document.getElementById("text").innerText = "すでに戦争状態です。";
        return;
    }
    document.getElementById("text").innerText = "宣戦布告しました！";
    sqlRequest("INSERT INTO war VALUES (" + myCountryId + "," + targetCountryId + ")");
}

function now() { //yyyymmddhhmmss形式の現在の日付時刻を取得
    const time = new Date();
    let month = time.getMonth() + 1;
    if (month < 10) month = "0" + month;
    let date = time.getDate();
    if (date < 10) date = "0" + date;
    let hour = time.getHours();
    if (hour < 10) hour = "0" + hour;
    let minute = time.getMinutes();
    if (minute < 10) minute = "0" + minute;
    let second = time.getSeconds();
    if (second < 10) second = "0" + second;
    return "" + time.getFullYear() + month + date + hour + minute + second;
}

function csvToArray(path) { //CSVを配列に
    var csvData = new Array();
    var data = new XMLHttpRequest();
    data.open("GET", path, false);
    data.send(null);
    var LF = String.fromCharCode(10);
    var lines = data.responseText.split(LF);
    for (let i = 1; i < lines.length; ++i) { //1行目をスキップ
        let cells = lines[i].split(",");
        if (cells.length != 1) {
            csvData.push(cells);
        }
    }
    return csvData;
}

function requestPhp(command, path, data) {
    const request = new XMLHttpRequest();
    request.open("POST", "main.php", false);
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.send("command=" + command + "&path=" + path + "&data=" + data);
    return request.responseText;
}

function sqlRequest(state = "") {
    const result = requestPhp("sql", "", state).split("error")[0].split("\n"); //なぜかついてくるerrorを除去
    let list = [];
    for (let i = 0; i < result.length - 1; i++) { //配列の最後は空行なので飛ばす
        list.push(JSON.parse(result[i]));
    }
    return list;
}

function test() {
    console.log(sqlRequest("SELECT * FROM war"));
    //最新のプロヴィンス情報を取得↓
    //SELECT * FROM province ORDER BY timestamp desc limit 3;
    //UPDATE province SET countryId=2,timestamp=NOW() WHERE r=207 AND g=223 AND b=223;
    //SELECT countryId,name from country order by countryId desc limit 3
    //(Math.floor(Math.random() * 40) + 1)
}