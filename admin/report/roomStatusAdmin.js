<?php

include ('db.php');

$checkin = $_GET['checkin1'];
$checkout = $_GET['checkin2'];

//$checkin = "2022-10-15";
//$checkout = "2022-12-31";

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

?>