<?php

include('session.php'); 
include('db.php');

if(!isset($_SESSION['login_user'])){ 
  header("location: indexlogin.php"); // Redirecting To Home Page 
}

	$sql = "SELECT * FROM card_db WHERE active='yes' ORDER BY issuedto";
	$result = mysqli_query($conn, $sql);

?>
