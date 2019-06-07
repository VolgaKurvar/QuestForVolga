<?php
//お金を増やす
$provinces=file("provinces.csv");
$pByC=array();
foreach($provinces as $i){
    $i=explode(",",$i);
    $i[count($i)-1]=explode("\n",$i[count($i)-1])[0]; //改行コードを除去
    $pByC[$i[3].",".$i[4].",".$i[5]] += 1;
}
var_dump($pByC);

$countries=file("countries.csv");
for($i=1;$i<count($countries);$i++){
    $countries[$i]=explode(",",$countries[$i]);
    $countries[$i][count($countries[$i])-1]=explode("\n",$countries[$i][count($countries[$i])-1])[0]; //改行コードを除去
    $countries[$i][4]+=$pByC[$countries[$i][0].",".$countries[$i][1].",".$countries[$i][2]];
    $countries[$i][count($countries[$i])-1]=$countries[$i][count($countries[$i])-1]."\n"; //改行コード付与
    $countries[$i]=implode(",",$countries[$i]);
}
file_put_contents("countries.csv",$countries);
?>