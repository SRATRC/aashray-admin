<?php

include('db.php');
//$checkin1 = $_GET['checkin1'];
//$checkin2 = $_GET['checkin2'];

$query = "SELECT count(*) AS pr_total FROM card_db WHERE status='onprem' AND res_status='PR'";
$result = mysqli_query($conn, $query) or die("Failed to query database ".mysqli_error());
$row = mysqli_fetch_assoc($result);

$query1 = "SELECT count(*) AS guest_total FROM card_db WHERE status='checkedin' AND res_status='MUMUKSHU'";
$result1 = mysqli_query($conn, $query1) or die("Failed to query database ".mysqli_error());
$row1 = mysqli_fetch_assoc($result1);

$query2 = "SELECT count(*) AS sevakutir_total FROM card_db WHERE status='onprem' AND res_status='Seva_Kutir'";
$result2 = mysqli_query($conn, $query2) or die("Failed to query database ".mysqli_error());
$row2 = mysqli_fetch_assoc($result2);

?>