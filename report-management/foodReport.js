<?php

include('db.php'); 

$checkin1 = $_GET['checkin1'];
$checkin2 = $_GET['checkin2'];


// Breakfast

$sql = "SELECT fordate, sum(plateissued='yes') AS plates, sum(plateissued='') AS platesno, sum(plateissued !='NA') AS total, sum(physical_plate_count) AS physical_count FROM transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='breakfast' GROUP BY fordate";
$result = mysqli_query($conn, $sql);

$sql1 = "SELECT count(transaction_detail) AS meal_total from transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='breakfast' AND plateissued !='NA'";
$result1 = mysqli_query($conn, $sql1);
$row1 = mysqli_fetch_array($result1);

$sql2 = "SELECT count(plateissued) AS total_plate_issued from transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='breakfast' AND plateissued='yes'";
$result2 = mysqli_query($conn, $sql2);
$row2 = mysqli_fetch_array($result2);

$sql22 = "SELECT sum(physical_plate_count) AS total_physical_plate_count from transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='breakfast' AND plateissued='NA'";
$result22 = mysqli_query($conn, $sql22);
$row22 = mysqli_fetch_array($result22);

/* $sql22 = "SELECT sum(breakfast_count) AS physical_count FROM transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='breakfast_count'";
$result22 = mysqli_query($conn, $sql22);
$row22 = mysqli_fetch_array($result22); */


// Lunch

$sql3 = "SELECT fordate, sum(plateissued='yes') AS plates, sum(plateissued='') AS platesno, sum(plateissued !='NA') AS total, sum(physical_plate_count) AS physical_count FROM transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='lunch' GROUP BY fordate";
$result3 = mysqli_query($conn, $sql3);

$sql4 = "SELECT count(transaction_detail) AS meal_total from transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='lunch' AND plateissued !='NA'";
$result4 = mysqli_query($conn, $sql4);
$row4 = mysqli_fetch_array($result4);

$sql5 = "SELECT count(plateissued) AS total_plate_issued from transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='lunch' AND plateissued='yes'";
$result5 = mysqli_query($conn, $sql5);
$row5 = mysqli_fetch_array($result5);

$sql32 = "SELECT sum(physical_plate_count) AS total_physical_plate_count from transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='lunch' AND plateissued='NA'";
$result32 = mysqli_query($conn, $sql32);
$row32 = mysqli_fetch_array($result32);

// Dinner

$sql6 = "SELECT fordate, sum(plateissued='yes') AS plates, sum(plateissued='') AS platesno, sum(plateissued !='NA') AS total, sum(physical_plate_count) AS physical_count FROM transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='dinner' GROUP BY fordate";
$result6 = mysqli_query($conn, $sql6);

$sql7 = "SELECT count(transaction_detail) AS meal_total from transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='dinner' AND plateissued !='NA'";
$result7 = mysqli_query($conn, $sql7);
$row7 = mysqli_fetch_array($result7);

$sql8 = "SELECT count(plateissued) AS total_plate_issued from transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='dinner' AND plateissued='yes'";
$result8 = mysqli_query($conn, $sql8);
$row8 = mysqli_fetch_array($result8);

$sql42 = "SELECT sum(physical_plate_count) AS total_physical_plate_count from transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='dinner' AND plateissued='NA'";
$result42 = mysqli_query($conn, $sql42);
$row42 = mysqli_fetch_array($result42);

// MILK

$sql9 = "SELECT fordate, sum(plateissued='yes') AS plates, sum(plateissued='') AS platesno, sum(plateissued !='NA') AS total, sum(physical_plate_count) AS physical_count FROM transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='milk' GROUP BY fordate";
$result9 = mysqli_query($conn, $sql9);

$sql10 = "SELECT count(transaction_detail) AS meal_total from transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='milk' AND plateissued !='NA'";
$result10 = mysqli_query($conn, $sql10);
$row10 = mysqli_fetch_array($result10);

$sql11 = "SELECT count(plateissued) AS total_plate_issued from transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='milk'";
$result11 = mysqli_query($conn, $sql11);
$row11 = mysqli_fetch_array($result11);

$sql52 = "SELECT sum(physical_plate_count) AS total_physical_plate_count from transaction WHERE fordate<='$checkin2' AND fordate>='$checkin1' AND transaction_detail='milk' AND plateissued='NA'";
$result52 = mysqli_query($conn, $sql52);
$row52 = mysqli_fetch_array($result52);

//echo $row1['total_deposit'];

//$result1 = mysqli_query($conn, $sql);
//$row1 = mysqli_fetch_assoc($result1);
//$row1 = mysqli_fetch_array($result1);



	//header("location: assign_card.php"); // Redirecting To Profile Page 
?>