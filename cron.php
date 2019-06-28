<?php
try {
    $pdo = new PDO('mysql:host=mysql1.php.xdomain.ne.jp;dbname=kurvan1112_qfv;charset=utf8','kurvan1112_db','mriz1112',
    array(PDO::ATTR_EMULATE_PREPARES => false));
} catch (PDOException $e) {
    exit('データベース接続失敗。'.$e->getMessage());
}

//お金を増やす
$stmt = $pdo->query("UPDATE country SET money=money+(SELECT COUNT(*) FROM province WHERE province.countryId=country.countryId),timestamp=NOW()");

//戦争
$stmt = $pdo->query("SELECT * FROM war");
header("Content-Type: application/json; charset=utf-8");
$result=array();
while($row = $stmt -> fetch(PDO::FETCH_ASSOC)) {
    array_push($result,$row);
}
$newMilitarys=array();
foreach ($result as $value) {
    //互いの軍事力を取得します
    //補正後軍事力=軍事力/参戦戦争数
    //軍事力3の国が2つの戦争に参加した場合、それぞれの戦争では1.5と扱われます。
    $stmt = $pdo->query("SELECT military FROM country WHERE countryId=".$value["countryIdA"]);
    $countryAMilitary = ($stmt -> fetch(PDO::FETCH_ASSOC))["military"];
    $stmt = $pdo->query("SELECT COUNT(*) AS num FROM war WHERE countryIdA=".$value["countryIdA"]." OR countryIdB=".$value["countryIdA"]);
    $aWars = ($stmt -> fetch(PDO::FETCH_ASSOC))["num"];
    $stmt = $pdo->query("SELECT military FROM country WHERE countryId=".$value["countryIdB"]);
    $countryBMilitary = ($stmt -> fetch(PDO::FETCH_ASSOC))["military"];
    $stmt = $pdo->query("SELECT COUNT(*) AS num FROM war WHERE countryIdA=".$value["countryIdB"]." OR countryIdB=".$value["countryIdB"]);
    $bWars = ($stmt -> fetch(PDO::FETCH_ASSOC))["num"];

    //国名を取得
    $stmt = $pdo->query("SELECT name FROM country WHERE countryId=".$value["countryIdA"]);
    $aName=($stmt -> fetch(PDO::FETCH_ASSOC))["name"];
    $stmt = $pdo->query("SELECT name FROM country WHERE countryId=".$value["countryIdB"]);
    $bName=($stmt -> fetch(PDO::FETCH_ASSOC))["name"];

    //お互い削り合います
    //もともとの軍事力に対する補正量を配列に格納
    $newMilitarys[$value["countryIdA"]]+=-round($countryAMilitary/$aWars-max(0,$countryAMilitary/$aWars-$countryBMilitary/$bWars));
    $newMilitarys[$value["countryIdB"]]+=-round($countryBMilitary/$bWars-max(0,$countryBMilitary/$bWars-$countryAMilitary/$aWars));    
}

//軍事力を更新します
foreach ($newMilitarys as $key => $value) {
    $stmt = $pdo->query("SELECT military FROM country WHERE countryId=".$key);
    $military = ($stmt -> fetch(PDO::FETCH_ASSOC))["military"];
    $stmt = $pdo->query("UPDATE country SET military=".max(0,$military+$value)." WHERE countryId=".$key);
    $stmt -> fetch(PDO::FETCH_ASSOC);
}


//軍事力が尽きた国は敗戦とします
foreach ($result as $value) {
    //軍事力を取得します
    $stmt = $pdo->query("SELECT military FROM country WHERE countryId=".$value["countryIdA"]);
    $aMilitary = ($stmt -> fetch(PDO::FETCH_ASSOC))["military"];
    $stmt = $pdo->query("SELECT military FROM country WHERE countryId=".$value["countryIdB"]);
    $bMilitary = ($stmt -> fetch(PDO::FETCH_ASSOC))["military"];
    if($aMilitary==0){
        if($bMilitary==0){ //双方敗戦していた場合
            $stmt = $pdo->query("DELETE FROM war WHERE countryIdA=".$value["countryIdA"]."countryIdB=."+$value["countryIdB"]);
            $stmt -> fetch(PDO::FETCH_ASSOC); //戦争を削除
        }else{ //Aが敗戦していた場合
            $stmt = $pdo->query("INSERT INTO claim('countryIdA','countryIdB','claim') VALUES (".$value["countryIdB"].", ".$value["countryIdA"].",3)");
            $stmt -> fetch(PDO::FETCH_ASSOC); //BがAに対し3マス主張できる
            $stmt = $pdo->query("DELETE FROM war WHERE countryIdA=".$value["countryIdA"]."countryIdB=."+$value["countryIdB"]);
            $stmt -> fetch(PDO::FETCH_ASSOC); //戦争を削除
        }
    }else if($bMilitary==0){
        $stmt = $pdo->query("INSERT INTO claim(countryIdA,countryIdB,claim) VALUES (".$value["countryIdA"].", ".$value["countryIdB"].",3)");
        $stmt -> fetch(PDO::FETCH_ASSOC); //AがBに対し3マス主張できる
        $stmt = $pdo->query("DELETE FROM war WHERE countryIdA=".$value["countryIdA"]."countryIdB=."+$value["countryIdB"]);
        $stmt -> fetch(PDO::FETCH_ASSOC); //戦争を削除
    }
}

//ログ
//$stmt = $pdo->query("INSERT INTO `log`(time,text) VALUES ( NOW(), 'テストやで～')");


//$row2 = $stmt -> fetch(PDO::FETCH_ASSOC);

//$stmt = $pdo->query("SELECT * FROM log");
//var_dump($stmt -> fetch(PDO::FETCH_ASSOC));

//$stmt = $pdo->query("SELECT * FROM 'log'");
//var_dump($stmt -> fetch(PDO::FETCH_ASSOC));
?>