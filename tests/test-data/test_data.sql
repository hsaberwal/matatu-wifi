-- Test data for Matatu WiFi system
-- Run this after the initial schema is created

USE matatu_wifi;

-- Insert test advertisers
INSERT INTO advertisers (id, name, email, phone, status) VALUES
(1, 'Safaricom PLC', 'ads@safaricom.co.ke', '+254722000000', 'active'),
(2, 'Equity Bank', 'marketing@equitybank.co.ke', '+254763000000', 'active'),
(3, 'Tusker Lager', 'ads@tusker.co.ke', '+254700000000', 'active'),
(4, 'Naivas Supermarket', 'marketing@naivas.co.ke', '+254701000000', 'active'),
(5, 'Test Advertiser', 'test@example.com', '+254700111111', 'active');

-- Insert test ads
INSERT INTO ads (name, advertiser_id, video_url, duration_seconds, weight, status, created_at) VALUES
('Welcome to Matatu WiFi', 1, '/ads/videos/welcome.mp4', 30, 10, 'active', NOW()),
('Safaricom M-PESA Offer', 1, '/ads/videos/mpesa_offer.mp4', 30, 8, 'active', NOW()),
('Equity Bank Loan Services', 2, '/ads/videos/equity_loans.mp4', 30, 6, 'active', NOW()),
('Tusker Lager - Celebrate Responsibly', 3, '/ads/videos/tusker_ad.mp4', 30, 5, 'active', NOW()),
('Naivas Weekly Offers', 4, '/ads/videos/naivas_offers.mp4', 30, 7, 'active', NOW()),
('Test Ad - Please Ignore', 5, '/ads/videos/test_ad.mp4', 30, 1, 'active', NOW());

-- Insert test device profiles
INSERT INTO device_profiles (mac_address, device_type, os_type, browser, total_sessions, total_ads_watched) VALUES
('AA:BB:CC:DD:EE:01', 'Mobile Phone', 'Android', 'Chrome', 5, 5),
('AA:BB:CC:DD:EE:02', 'Mobile Phone', 'iOS', 'Safari', 3, 3),
('AA:BB:CC:DD:EE:03', 'Tablet', 'Android', 'Chrome', 2, 2),
('AA:BB:CC:DD:EE:04', 'Laptop', 'Windows', 'Edge', 1, 1),
('AA:BB:CC:DD:EE:05', 'Mobile Phone', 'Android', 'Firefox', 4, 4);

-- Insert sample ad categories and mappings
INSERT INTO ad_category_mapping (ad_id, category_id) VALUES
(1, 5), -- Welcome ad -> Services
(2, 5), -- M-PESA -> Services  
(3, 5), -- Equity -> Services
(4, 3), -- Tusker -> Entertainment
(5, 4), -- Naivas -> Shopping
(6, 5); -- Test ad -> Services

-- Create a sample video file (placeholder)
-- In production, actual video files would be uploaded through the admin interface