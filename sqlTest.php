<?php

try {
  $pdo = new PDO('mysql:host=mysql1.php.xdomain.ne.jp;dbname=kurvan1112_qfv;charset=utf8','kurvan1112_db','mriz1112',
  array(PDO::ATTR_EMULATE_PREPARES => false));
  } catch (PDOException $e) {
   exit('データベース接続失敗。'.$e->getMessage());
}

$q1="SELECT * FROM test";
$q2="INSERT INTO test(c1,c2) VALUES ('test','test2')";

$stmt = $pdo->query($q1);
while($row = $stmt -> fetch(PDO::FETCH_ASSOC)) {
  var_dump($row);
}

?>