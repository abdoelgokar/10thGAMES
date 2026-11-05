<?php
/**
 * SPIDER X — Auth Logout API
 * backend/auth/logout.php
 */

header("Content-Type: application/json; charset=UTF-8");
echo json_encode(["success" => true, "message" => "Logged out successfully"]);
