<?php
try {
    $pdo = new PDO('mysql:host=mysql1.php.xdomain.ne.jp;dbname=kurvan1112_qfv;charset=utf8','kurvan1112_db','mriz1112',
    array(PDO::ATTR_EMULATE_PREPARES => false));
} catch (PDOException $e) {
    exit('データベース接続失敗。'.$e->getMessage());
}

//お金を増やす
$stmt = $pdo->query("UPDATE country SET money=money+(SELECT COUNT(*) FROM province WHERE province.countryId=country.countryId),timestamp=NOW()");
?>