<?php

include ('db.php');

$checkin = $_GET['checkin1'];
$checkout = $_GET['checkin2'];

//$checkin = "2022-08-15";
//$checkout = "2022-08-31";

$date1 = new DateTime($checkin);
$date2 = new DateTime($checkout);
$nights  = $date2->diff($date1)->format('%a');

function displayDates($date1, $date2, $format = 'Y-m-d' ) {
    $dates = array();
    $current = strtotime($date1);
    $date2 = strtotime($date2);
    $stepVal = '+1 day';
    while( $current <= $date2 ) {
       $dates[] = date($format, $current);
       $current = strtotime($stepVal, $current);
    }
    return $dates;
 }
 $date = displayDates($checkin, $checkout);


/* $query_total_qt_ac = "SELECT * FROM qtroomdb WHERE roomtype='ac' AND roomstatus='available'";
$result_total_qt_ac = mysqli_query($conn, $query_total_qt_ac) or die("Failed to query database ".mysqli_error());
$total_qt_ac = mysqli_num_rows($result_total_qt_ac);

$query_total_qt_nac = "SELECT * FROM qtroomdb WHERE roomtype='nac' AND roomstatus='available'";
$result_total_qt_nac = mysqli_query($conn, $query_total_qt_nac) or die("Failed to query database ".mysqli_error());
$total_qt_nac = mysqli_num_rows($result_total_qt_nac);
 */
$query_total_main_ac = "SELECT * FROM roomdb WHERE roomtype='ac' AND roomstatus='available'";
$result_total_main_ac = mysqli_query($conn, $query_total_main_ac) or die("Failed to query database ".mysqli_error());
$total_main_ac = mysqli_num_rows($result_total_main_ac);

$query_total_main_nac = "SELECT * FROM roomdb WHERE roomtype='nac' AND roomstatus='available'";
$result_total_main_nac = mysqli_query($conn, $query_total_main_nac) or die("Failed to query database ".mysqli_error());
$total_main_nac = mysqli_num_rows($result_total_main_nac);

?>