# in your_app/face_recognition.py

import boto3
from botocore.config import Config
import logging

logger = logging.getLogger(__name__)

def _rekognition_client(aws_access_key, aws_secret_key, aws_region):
    return boto3.client(
        'rekognition',
        region_name=aws_region,
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key,
        config=Config(
            connect_timeout=5,
            read_timeout=15,
            retries={'max_attempts': 1},
        ),
    )


def compare_faces(source_bytes, target_bytes, aws_access_key, aws_secret_key, aws_region='us-east-2', similarity_threshold=95):
    """Compare two faces using AWS Rekognition. Accepts image bytes directly."""
    if not (0 <= similarity_threshold <= 100):
        raise ValueError("similarity_threshold must be between 0 and 100")
    try:
        rekognition = _rekognition_client(aws_access_key, aws_secret_key, aws_region)
        return rekognition.compare_faces(
            SourceImage={'Bytes': source_bytes},
            TargetImage={'Bytes': target_bytes},
            SimilarityThreshold=similarity_threshold,
        )
    except Exception as e:
        logger.error(f"AWS Rekognition compare_faces error: {str(e)}")
        raise e


def count_faces(image_bytes, aws_access_key, aws_secret_key, aws_region='us-east-2'):
    """Return the number of faces detected in `image_bytes`.

    Used to sanity-check the first-ever reference photo — a screenshot, blank
    frame, or a group photo is a bad reference, and letting one through
    permanently breaks that employee's face verification.

    Returns 0 on any Rekognition failure so callers can decide whether to
    accept the image anyway (degraded mode) vs reject it.
    """
    try:
        rekognition = _rekognition_client(aws_access_key, aws_secret_key, aws_region)
        resp = rekognition.detect_faces(
            Image={'Bytes': image_bytes},
            Attributes=['DEFAULT'],
        )
        return len(resp.get('FaceDetails', []) or [])
    except Exception as e:
        logger.error(f"AWS Rekognition detect_faces error: {str(e)}")
        return 0