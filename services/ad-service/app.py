import os
import logging
from flask import Flask, jsonify, request, render_template, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import redis
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{os.getenv('MYSQL_USER')}:{os.getenv('MYSQL_PASSWORD')}@{os.getenv('MYSQL_HOST')}/{os.getenv('MYSQL_DATABASE')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = '/app/static/ads'
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024  # 200MB max file size

# Initialize extensions
db = SQLAlchemy(app)
CORS(app)

# Redis connection
redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    decode_responses=True
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Allowed file extensions
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'webm', 'ogg'}
ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}

def allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

# Models (using existing database schema)
class Ad(db.Model):
    __tablename__ = 'ads'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    advertiser_id = db.Column(db.Integer)
    video_url = db.Column(db.String(500))
    duration_seconds = db.Column(db.Integer, default=30)
    weight = db.Column(db.Integer, default=1)
    status = db.Column(db.Enum('active', 'inactive', 'scheduled'), default='active')
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AdImpression(db.Model):
    __tablename__ = 'ad_impressions'
    
    id = db.Column(db.BigInteger, primary_key=True)
    ad_id = db.Column(db.Integer, nullable=False)
    session_id = db.Column(db.BigInteger, nullable=False)
    mac_address = db.Column(db.String(17), nullable=False)
    impression_time = db.Column(db.DateTime, default=datetime.utcnow)
    watched_duration_seconds = db.Column(db.Integer, default=0)
    completed = db.Column(db.Boolean, default=False)

# Routes
@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'ad-service',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/ads/select', methods=['GET'])
def select_ad():
    """Select next ad for user based on history and weights"""
    try:
        mac_address = request.args.get('macAddress')
        session_id = request.args.get('sessionId')
        device_type = request.args.get('deviceType', 'unknown')
        
        # Get previously shown ads for this MAC (last 24 hours)
        recent_ads = db.session.query(AdImpression.ad_id).filter(
            AdImpression.mac_address == mac_address,
            AdImpression.impression_time > datetime.utcnow() - timedelta(hours=24)
        ).distinct().all()
        
        recent_ad_ids = [ad[0] for ad in recent_ads]
        
        # Query for active ads
        query = Ad.query.filter(
            Ad.status == 'active',
            db.or_(Ad.start_date.is_(None), Ad.start_date <= datetime.utcnow().date()),
            db.or_(Ad.end_date.is_(None), Ad.end_date >= datetime.utcnow().date())
        )
        
        # Exclude recently shown ads if possible
        if recent_ad_ids:
            # First try to get ads not shown recently
            new_ads = query.filter(~Ad.id.in_(recent_ad_ids)).all()
            if new_ads:
                ads = new_ads
            else:
                # If all ads have been shown, use all active ads
                ads = query.all()
        else:
            ads = query.all()
        
        if not ads:
            return jsonify({
                'success': False,
                'message': 'No ads available'
            }), 404
        
        # Select ad based on weights
        selected_ad = select_weighted_ad(ads)
        
        # Cache selection
        cache_key = f"ad_selection:{session_id}"
        redis_client.setex(cache_key, 300, selected_ad.id)  # Cache for 5 minutes
        
        return jsonify({
            'success': True,
            'ad': {
                'id': selected_ad.id,
                'name': selected_ad.name,
                'video_url': f"/ads/videos/{os.path.basename(selected_ad.video_url)}",
                'duration_seconds': selected_ad.duration_seconds,
                'advertiser_name': get_advertiser_name(selected_ad.advertiser_id)
            }
        })
        
    except Exception as e:
        logger.error(f"Error selecting ad: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error selecting ad'
        }), 500

def select_weighted_ad(ads):
    """Select ad based on weights"""
    import random
    
    # Calculate total weight
    total_weight = sum(ad.weight for ad in ads)
    
    if total_weight == 0:
        # If all weights are 0, select randomly
        return random.choice(ads)
    
    # Random selection based on weights
    rand = random.uniform(0, total_weight)
    cumulative = 0
    
    for ad in ads:
        cumulative += ad.weight
        if rand <= cumulative:
            return ad
    
    # Fallback (should not reach here)
    return ads[-1]

def get_advertiser_name(advertiser_id):
    """Get advertiser name from ID"""
    if not advertiser_id:
        return "Unknown"
    
    # This would normally query the advertisers table
    # For now, return a placeholder
    return f"Advertiser {advertiser_id}"

@app.route('/api/ads', methods=['GET'])
def list_ads():
    """List all ads with statistics"""
    try:
        ads = Ad.query.all()
        result = []
        
        for ad in ads:
            # Get impression statistics
            impressions = AdImpression.query.filter_by(ad_id=ad.id).all()
            completed = sum(1 for imp in impressions if imp.completed)
            
            result.append({
                'id': ad.id,
                'name': ad.name,
                'status': ad.status,
                'weight': ad.weight,
                'duration_seconds': ad.duration_seconds,
                'impressions': len(impressions),
                'completed_views': completed,
                'completion_rate': (completed / len(impressions) * 100) if impressions else 0,
                'created_at': ad.created_at.isoformat()
            })
        
        return jsonify({
            'success': True,
            'ads': result
        })
        
    except Exception as e:
        logger.error(f"Error listing ads: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error retrieving ads'
        }), 500

@app.route('/api/ads/upload', methods=['POST'])
def upload_ad():
    """Upload new ad video"""
    try:
        if 'video' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No video file provided'
            }), 400
        
        file = request.files['video']
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename, ALLOWED_VIDEO_EXTENSIONS):
            return jsonify({
                'success': False,
                'message': 'Invalid file type. Allowed: mp4, webm, ogg'
            }), 400
        
        # Save file
        filename = secure_filename(file.filename)
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], 'videos', filename)
        file.save(filepath)
        
        # Get video duration (requires moviepy)
        try:
            from moviepy.editor import VideoFileClip
            clip = VideoFileClip(filepath)
            duration = int(clip.duration)
            clip.close()
        except:
            duration = 30  # Default duration
        
        # Create ad record
        ad = Ad(
            name=request.form.get('name', filename),
            advertiser_id=request.form.get('advertiser_id', 1),
            video_url=f"/ads/videos/{filename}",
            duration_seconds=duration,
            weight=int(request.form.get('weight', 1)),
            status='active'
        )
        
        db.session.add(ad)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Ad uploaded successfully',
            'ad_id': ad.id
        })
        
    except Exception as e:
        logger.error(f"Error uploading ad: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error uploading ad: {str(e)}'
        }), 500

@app.route('/api/ads/<int:ad_id>/status', methods=['PUT'])
def update_ad_status(ad_id):
    """Update ad status"""
    try:
        ad = Ad.query.get_or_404(ad_id)
        data = request.get_json()
        
        if 'status' in data:
            ad.status = data['status']
        if 'weight' in data:
            ad.weight = int(data['weight'])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Ad updated successfully'
        })
        
    except Exception as e:
        logger.error(f"Error updating ad: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error updating ad'
        }), 500

@app.route('/ads/<path:filename>')
def serve_ad(filename):
    """Serve ad files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/')
def index():
    """Admin dashboard"""
    return render_template('dashboard.html')

@app.route('/admin/upload')
def upload_page():
    """Ad upload page"""
    return render_template('upload.html')

@app.route('/metrics')
def metrics():
    """Prometheus metrics endpoint"""
    # Basic metrics for monitoring
    active_ads = Ad.query.filter_by(status='active').count()
    total_impressions = AdImpression.query.count()
    
    metrics_text = f"""
# HELP ad_service_active_ads Number of active ads
# TYPE ad_service_active_ads gauge
ad_service_active_ads {active_ads}

# HELP ad_service_total_impressions Total ad impressions
# TYPE ad_service_total_impressions counter
ad_service_total_impressions {total_impressions}
"""
    
    return metrics_text, 200, {'Content-Type': 'text/plain'}

# Error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'success': False,
        'message': 'Resource not found'
    }), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)