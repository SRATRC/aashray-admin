<?php
//include('session.php'); 

$reportType = $_POST['reportType'];
$checkin1 = $_POST['checkin1'];
$checkin2 = $_POST['checkin2'];

header("refresh:0; url=$reportType?checkin1=$checkin1&checkin2=$checkin2");
?>