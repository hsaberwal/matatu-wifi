#!/bin/bash
# Create placeholder video files for testing
# These are just text files renamed as .mp4 for testing purposes
# In production, real video files would be used

echo "Creating test video placeholders..."

# Create directories if they don't exist
mkdir -p data/ads/videos
mkdir -p data/ads/images
mkdir -p data/ads/temp

# Create placeholder files
touch data/ads/videos/welcome.mp4
touch data/ads/videos/mpesa_offer.mp4
touch data/ads/videos/equity_loans.mp4
touch data/ads/videos/tusker_ad.mp4
touch data/ads/videos/naivas_offers.mp4
touch data/ads/videos/test_ad.mp4

# Add some content to make them non-empty
echo "This is a placeholder for welcome.mp4" > data/ads/videos/welcome.mp4
echo "This is a placeholder for mpesa_offer.mp4" > data/ads/videos/mpesa_offer.mp4
echo "This is a placeholder for equity_loans.mp4" > data/ads/videos/equity_loans.mp4
echo "This is a placeholder for tusker_ad.mp4" > data/ads/videos/tusker_ad.mp4
echo "This is a placeholder for naivas_offers.mp4" > data/ads/videos/naivas_offers.mp4
echo "This is a placeholder for test_ad.mp4" > data/ads/videos/test_ad.mp4

echo "Test video placeholders created!"
echo ""
echo "Note: These are not real video files."
echo "For actual testing, upload real MP4 files through the admin interface."
