<?php

include('db.php'); 

$today = mktime(0,0,0,date("m"),date("d"),date("Y"));
$Echo =  "".date("Y-m-d", $today);


$transaction_detail=$_POST['transaction_detail'];
$cardno = $_POST['cardno'];
$found = $transaction_detail."check_read.php";

//echo $cardno, $transaction_detail, $Echo;
		
	if(!$conn)
		{
			echo 'Not connected To Server';
		}

		if(!mysqli_select_db($conn,'sratrc'))
		{
			echo 'Database Not Selected';
		}
		
		$sql1 = "SELECT * FROM transaction WHERE cardno='$cardno' AND transaction_detail='$transaction_detail' AND fordate='$Echo' AND plateissued != 'yes'";
		$result = mysqli_query($conn, $sql1);
		
		$resultcheck = mysqli_num_rows($result);
		
		if ($resultcheck > 0){
			
			$sql = "UPDATE transaction SET plateissued='yes' WHERE cardno='$cardno' AND transaction_detail='$transaction_detail' AND fordate='$Echo'";
			
			if(!mysqli_query($conn,$sql))
			{
				echo 'RECORD NOT SUBMITTED. Please contact Systems Control Room';
			}
			
			else
			{
				//echo  '                   Enjoy the food';
				//header("location: $found"); // Redirecting To Profile Page 
				//header("refresh:1; url=$found");
				header("refresh:0; url=foodcheckresult_ok.php?mealtype=$transaction_detail&cardno=$cardno");
			}
		}
		else 	
		{
			//echo 'You have not registered or plate already issued for this meal. Please contact kitchen in-charge';
			//header("location: foodcheckerror.php?meal=$transaction_detail"); // Redirecting To Profile Page 
			header("refresh:0; url=foodcheckresult_notok.php?mealtype=$transaction_detail");
		}
?>


