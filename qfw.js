"use strict";

const FILL_SIZE = 150;
let provinceMap = null, politicalMap = null;
let nx = 0, ny = 0, mapX = -2500, mapY = -300, myCountryColor = [255, 255, 255], annexMode = 0, pLastTime = 0, cLastTime = 0, myCountryId = null, targetCountryId = null;
let selectingProvince = null;

onload = () => {
    //canvas初期化
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext('2d');
    const map = document.getElementById("whiteMap");

    //プロヴィンスマップと白地図を取得
    provinceMap = new ImageDataController(createImageData(document.getElementById("provinceMap")));
    politicalMap = new ImageDataController(createImageData(document.getElementById("whiteMap")));

    //canvas要素に対してドラッグを可能にします
    const canvasDC = new DragController(canvas, fillstart2, moveMap);

    //ランダムな色を設定
    document.getElementById("color").value = "#" + Math.floor(Math.random() * 256).toString(16) + Math.floor(Math.random() * 256).toString(16) + Math.floor(Math.random() * 256).toString(16);

    //UIのサイズ調整
    {
        const targetCountryFlag = document.getElementById("targetCountryFlag");
        targetCountryFlag.height = Math.round(targetCountryFlag.width * 0.67); //横：縦=3:2
        document.getElementById("middle").style.height = window.innerHeight - document.getElementById("header").offsetHeight + "px"; //ミドルを可能な限り縦に伸ばす
        //ウィンドウ幅の7割を地図表示領域とする
        canvas.width = Math.floor(document.getElementById("middle").offsetWidth * 0.88);
        canvas.height = Math.floor(window.innerHeight * 0.7);
    }

    //地図生成
    pLastTime = now();
    cLastTime = now();
    for (const i of sqlRequest("SELECT x,y,country.r,country.g,country.b FROM province INNER JOIN country ON province.countryId=country.countryId")) {
        politicalMap.fill(provinceMap, parseInt(i.x), parseInt(i.y), parseInt(i.r), parseInt(i.g), parseInt(i.b));
    }
    ctx.putImageData(politicalMap.imageData, mapX, mapY);

    setInterval(() => {
        //地図更新
        let responce = sqlRequest("SELECT x,y,r,g,b FROM (SELECT x,y,countryId FROM province where timestamp>" + pLastTime + " ORDER BY timestamp DESC) AS province2 INNER JOIN country ON province2.countryId=country.countryId");
        if (responce.length >= 1) { //プロヴィンスに関して更新があったら
            if (responce.length > -1) pLastTime = now(); //responceと無理やり同期させる
            console.log(responce);
            for (const i of responce) {
                politicalMap.fill(provinceMap, parseInt(i.x), parseInt(i.y), parseInt(i.r), parseInt(i.g), parseInt(i.b));
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
    }, 10000);

    function moveMap() {
        mapX += canvasDC.latestMouseX - canvasDC.oldMouseX;
        mapY += canvasDC.latestMouseY - canvasDC.oldMouseY;
        if (mapX > 0) mapX = 0;
        else if (mapX - canvas.width < -1 * map.width) mapX = -1 * map.width + canvas.width;
        if (mapY > 0) mapY = 0;
        else if (mapY - canvas.height < -1 * map.height) mapY = -1 * map.height + canvas.height;
        ctx.putImageData(politicalMap.imageData, mapX, mapY);
    }

    function fillstart2() {
        fillstart(canvasDC.startMouseX - canvas.offsetLeft, canvasDC.startMouseY - canvas.offsetTop);
    }

    function fillstart(mouseX, mouseY) {
        //この時点でselectingProvinceには、前にクリックしたプロヴィンスの情報が入っている
        if (selectingProvince != null) {
            let owner = getOwner(selectingProvince.r, selectingProvince.g, selectingProvince.b);
            if (owner !== null) politicalMap.fill(provinceMap, selectingProvince.x, selectingProvince.y, owner.r, owner.g, owner.b); //ここのlastXとlastYをどうにかする
            else politicalMap.fill(provinceMap, selectingProvince.x, selectingProvince.y, 255, 255, 255);
        }

        //選択しているマスの情報を更新します
        //x,yにはマップ上での座標が代入されます
        const x = mouseX - mapX, y = mouseY - mapY;
        let [r, g, b] = provinceMap.getColor(x, y);
        selectingProvince = new Province(x, y, r, g, b);
        politicalMap.fill(provinceMap, x, y, 255, 0, 0); //マスを赤く塗る
        ctx.putImageData(politicalMap.imageData, mapX, mapY);
        if (annexMode == 1) annexProvince();

        //宣戦布告ボタンを一度無効にする
        document.getElementById("declareWar").disabled = true;

        //選択しているマスの情報を表示する

        selectingProvinceColor = { "r": r, "g": g, "b": b };

        let owner = getOwner(r, g, b);
        if (owner === null) {
            targetCountryId = null;
            document.getElementById("targetCountryFlag").src = "img/255.255.255.png";
            document.getElementById("targetCountryName").innerText = "領有国なし";
            document.getElementById("targetMoney").innerText = "???";
            document.getElementById("targetMilitary").innerText = "???";
            return;
        }
        targetCountryId = owner.countryId;
        document.getElementById("targetCountryFlag").src = "img/" + owner.r + "." + owner.g + "." + owner.b + ".png";
        document.getElementById("targetCountryName").innerText = owner.name;
        document.getElementById("targetMoney").innerText = owner.money;
        document.getElementById("targetMilitary").innerText = owner.military;
        if (myCountryId !== null && myCountryId !== targetCountryId) document.getElementById("declareWar").disabled = false;
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
    politicalMap.fill(provinceMap, nx - mapX, ny - mapY, r, g, b);
    ctx.putImageData(politicalMap.imageData, mapX, mapY);
    selectCountry();
}

function selectCountry() {
    const owner = getOwner(selectingProvince.r, selectingProvince.g, selectingProvince.b);
    console.log(owner);
    if (owner === null) return; //領有国情報が見つからなかったらreturn

    document.getElementById("text").innerText = "外交の時間だ！"
    myCountryId = owner.countryId;
    myCountryColor = [owner.r, owner.g, owner.b];
    document.getElementById("myCountryFlag").src = "img/" + owner.r + "." + owner.g + "." + owner.b + ".png";
    document.getElementById("myCountryName").innerText = owner.name;
    document.getElementById("money").innerText = owner.money;
    document.getElementById("military").innerText = owner.military;
    document.getElementById("expandArmy").disabled = false;
    document.getElementById("disarm").disabled = false;
    document.getElementById("annex").disabled = false;
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
    politicalMap.fill(provinceMap, nx - mapX, ny - mapY, myCountryColor[0], myCountryColor[1], myCountryColor[2]);
    ctx.putImageData(politicalMap.imageData, mapX, mapY);
}

function getOwner(r, g, b) { //プロヴィンスのRGBから領有国情報を取得します
    const query = "SELECT * FROM country WHERE countryId=(SELECT countryId FROM province WHERE r=" + r + " AND g=" + g + " AND b=" + b + ")";
    const responce = sqlRequest(query);
    if (responce.length < 1) return null; //国が見つからなかった時
    return responce[0];
}

function isOwned(r, g, b) {
    const owner = getOwner(r, g, b);
    if (owner.r == 255, owner.g == 255, owner.b == 255) return false;
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

function createImageData(img) {
    //5616✕2160の画像を生成
    const IMG_WIDTH = 5616, IMG_HEIGHT = 2160;
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    var ct = cv.getContext('2d');
    ct.drawImage(img, 0, 0);
    var data = ct.getImageData(0, 0, cv.width, cv.height);
    return data;
}

function test() {
    localStorage.clear();
    //console.log(sqlRequest("SELECT * FROM war"));
    //最新のプロヴィンス情報を取得↓
    //SELECT * FROM province ORDER BY timestamp desc limit 3;
    //UPDATE province SET countryId=2,timestamp=NOW() WHERE r=207 AND g=223 AND b=223;
    //SELECT countryId,name from country order by countryId desc limit 3
    //(Math.floor(Math.random() * 40) + 1)
}

class Province {
    constructor(x = 0, y = 0, r = 255, g = 255, b = 255) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.g = g;
        this.b = b;
    }
}

class ImageDataController {
    constructor(imageData = new ImageData()) {
        this.imageData = imageData;
    }

    getPixelOffset(x, y) { //座標からデータが格納されている番号を取得します
        return (x + this.imageData.width * y) * 4;
    }

    getColor(x, y) { //座標からピクセルの色を取得します
        const n = this.getPixelOffset(x, y);
        return [this.imageData.data[n], this.imageData.data[n + 1], this.imageData.data[n + 2]];
    }

    setColor(x, y, r, g, b) { //座標に色を設定します
        const n = this.getPixelOffset(x, y);
        this.imageData.data[n] = r;
        this.imageData.data[n + 1] = g;
        this.imageData.data[n + 2] = b;
    }

    checkColor(x, y, r, g, b) { //座標が指定された色か確認します
        const n = this.getPixelOffset(x, y);
        return this.imageData.data[n] === r && this.imageData.data[n + 1] === g && this.imageData.data[n + 2] === b;
    }

    fill(reference, centerX, centerY, r, g, b) {
        if (this.checkColor(centerX, centerY, r, g, b) || this.checkColor(centerX, centerY, 0, 0, 0)) return; //既に塗られているか、線を選択したら戻る
        const [startPixelR, startPixelG, startPixelB] = reference.getColor(centerX, centerY);
        for (let y = centerY - FILL_SIZE; y < centerY + FILL_SIZE; y++) {
            for (let x = centerX - FILL_SIZE; x < centerX + FILL_SIZE; x++) {
                if (reference.checkColor(x, y, startPixelR, startPixelG, startPixelB)) {
                    this.setColor(x, y, r, g, b);
                }
            }
        }
    }
}

//ドラッグ操作を提供するクラス
class DragController {
    //element:ドラッグ管理対象のエレメント
    //startFunc:クリック時に実行する関数
    //dragFunc:ドラッグ時に実行する関数
    //startMouseX,startMouseY:ドラッグ開始時のマウス座標
    //latestMouseX,latestMouseY:最新のマウス座標
    //oldMouseX,oldMouseY:ドラッグイベント1つ前のマウス座標
    //isDragging
    constructor(element, startFunc = () => { }, dragFunc = () => { }) {
        this.element = element;
        this.startFunc = startFunc;
        this.dragFunc = dragFunc;
        element.addEventListener("mousedown", this.start);
        element.addEventListener("touchstart", this.start);
        self = this;
    }

    start(e) {
        e.preventDefault();
        if (e.type !== "mousedown") e = e.changedTouches[0];
        self.startMouseX = Math.round(e.pageX);
        self.startMouseY = Math.round(e.pageY);
        self.oldMouseX = self.startMouseX;
        self.oldMouseY = self.startMouseY;
        self.latestMouseX = self.startMouseX;
        self.latestMouseY = self.startMouseY;
        self.isDragging = true;

        self.element.addEventListener("mousemove", self.drag);
        self.element.addEventListener("touchmove", self.drag);
        self.element.addEventListener("mouseup", self.end);
        self.element.addEventListener("touchend", self.end);
        self.element.addEventListener("mouseleave", self.end);
        self.element.addEventListener("touchcancel", self.end);

        self.startFunc();
    }

    drag(e) {
        if (!self.isDragging) return;
        e.preventDefault();
        if (e.type !== "mousemove") e = e.changedTouches[0];
        self.latestMouseX = Math.round(e.pageX);
        self.latestMouseY = Math.round(e.pageY);
        self.dragFunc();
        self.oldMouseX = self.latestMouseX;
        self.oldMouseY = self.latestMouseY;
    }

    end(e) {
        e.preventDefault();
        self.isDragging = false;
        self.element.removeEventListener("mousemove", self.drag);
        self.element.removeEventListener("touchmove", self.drag);
        self.element.removeEventListener("mouseup", self.end);
        self.element.removeEventListener("touchend", self.end);
        self.element.removeEventListener("mouseleave", self.end);
        self.element.removeEventListener("touchcancel", self.end);
    }
}