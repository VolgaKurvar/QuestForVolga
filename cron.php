<?php
try {
    $pdo = new PDO('mysql:host=mysql1.php.xdomain.ne.jp;dbname=kurvan1112_qfv;charset=utf8','kurvan1112_db','mriz1112',
    array(PDO::ATTR_EMULATE_PREPARES => false));
} catch (PDOException $e) {
    exit('データベース接続失敗。'.$e->getMessage());
}

//お金を増やす
$stmt = $pdo->query("UPDATE country SET money=money+(SELECT COUNT(*) FROM province WHERE province.countryId=country.countryId),timestamp=NOW()");
$stmt = $pdo->query("SELECT * FROM war");
header("Content-Type: application/json; charset=utf-8");
$result=array();
while($row = $stmt -> fetch(PDO::FETCH_ASSOC)) {
    array_push($result,$row);
}
var_dump($result);
foreach ($result as $value) {
    $stmt = $pdo->query("SELECT military FROM country WHERE countryId=".$value["countryIdA"]);
    $countryAMilitary = $stmt -> fetch(PDO::FETCH_ASSOC);
    $stmt = $pdo->query("SELECT military FROM country WHERE countryId=".$value["countryIdB"]);
    $countryBMilitary = $stmt -> fetch(PDO::FETCH_ASSOC);
}
?>