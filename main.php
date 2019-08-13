<?php
require_once 'dbAccount.php';
error_reporting(0);
mb_language("ja");
mb_internal_encoding('UTF-8');

switch ($_POST['command']) {
    case "createCountry":
        $f=fopen("countries.csv","a");
        fwrite($f,$_POST['c']."\n");
        fclose($f);
        $f=fopen("provinces.csv","a");
        fwrite($f,$_POST['p']."\n");
        fclose($f);
        print("success");
        break;
    case "annexProvince":
        $f=fopen("provinces.csv","a");
        fwrite($f,$_POST['p']."\n");
        fclose($f);
        print("success");
        break;
    case "deleteProvince":
        $f=file("provinces.csv");
        $f[$_POST['p']]="";
        file_put_contents("provinces.csv",$f);
        print("success");
        break;
    case "add":
        $f=fopen($_POST['path'],"a");
        fwrite($f,$_POST['data']."\n");
        fclose($f);
        print("success");
        break;
    case "getUpdate":
        $f=file($_POST['path']);
        $result="";
        for ($i=1;$i<count($f);$i++) {
            $record=explode(",",$f[$i]);
            //print("yay". $record[1].",".$_POST['data']."  ");
            if( $record[0]>$_POST['data']){ //dataには最後のログ確認時刻が入ってる
                //print($record[0]-$_POST['data']);
                if ( $record[1] == "provinces.csv") {
                    $provinces = file("provinces.csv");
                    for ($j = count($provinces) -  $record[2]; $j < count($provinces); $j++) {
                        $provincesRecord=explode(",",$provinces[$j]); //csv末端には改行コードが入るのでexplodeで除去しています
                        $result=$result.$provincesRecord[6].",".explode("\n",$provincesRecord[7])[0].",".$provincesRecord[3].",".$provincesRecord[4].",".$provincesRecord[5].";";
                    }
                }
            }            
        }
        print($result);
        break;
    case "sql":
        try {
            $pdo = new PDO('mysql:host=localhost;dbname=volga;charset=utf8',dbUsername,dbPassword,
            array(PDO::ATTR_EMULATE_PREPARES => false));
        } catch (PDOException $e) {
            exit('データベース接続失敗。'.$e->getMessage());
        }

        $q1="SELECT * FROM test";
        $q2="INSERT INTO test(c1,c2) VALUES ('test','test2')";
        $q3="SHOW 
        TABLES";
        //$_POST['data']
        $stmt = $pdo->query($_POST['data']);
        header("Content-Type: application/json; charset=utf-8");
        while($row = $stmt -> fetch(PDO::FETCH_ASSOC)) {
            echo json_encode($row)."\n";
        }
    default:
        print("error");
        break;
}

?>