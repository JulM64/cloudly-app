// src/services/s3Service.js - AWS S3 File Upload Service (FIXED)

import AWS from 'aws-sdk';
import { awsConfig, getDepartmentBucket } from '../config/awsConfig';

class S3Service {
  constructor() {
    this.s3 = null;
    this.initialized = false;
  }

  // Initialize S3 with Cognito Credentials
  async initialize(idToken) {
    try {
      console.log('🔧 Initializing S3 Service...');
      console.log('   Region:', awsConfig.cognito.region);
      console.log('   Identity Pool:', awsConfig.cognito.identityPoolId);
      console.log('   User Pool:', awsConfig.cognito.userPoolId);
      
      // Check if Identity Pool ID is set
      if (!awsConfig.cognito.identityPoolId) {
        throw new Error('Identity Pool ID not configured. Please set REACT_APP_COGNITO_IDENTITY_POOL_ID in .env');
      }

      // Configure AWS SDK
      AWS.config.region = awsConfig.cognito.region;
      
      // Create the correct login key format
      const loginKey = `cognito-idp.${awsConfig.cognito.region}.amazonaws.com/${awsConfig.cognito.userPoolId}`;
      
      console.log('   Login Key:', loginKey);
      
      AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: awsConfig.cognito.identityPoolId,
        Logins: {
          [loginKey]: idToken
        }
      });

      // Get credentials
      await new Promise((resolve, reject) => {
        AWS.config.credentials.get((err) => {
          if (err) {
            console.error('❌ Error getting credentials:', err);
            reject(err);
          } else {
            console.log('✅ Credentials obtained');
            console.log('   Access Key ID:', AWS.config.credentials.accessKeyId?.substring(0, 10) + '...');
            resolve();
          }
        });
      });

      // Initialize S3
      this.s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        region: awsConfig.s3.region,
        params: {
          Bucket: '' // Will be set per request
        }
      });

      this.initialized = true;
      console.log('✅ S3 Service initialized successfully');
    } catch (error) {
      console.error('❌ S3 initialization failed:', error);
      throw error;
    }
  }

  // Ensure S3 is initialized
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('S3 Service not initialized. Call initialize() first.');
    }
  }

  // Upload File to Department Bucket
  async uploadFile(file, department, userId, onProgress) {
    this.ensureInitialized();

    const bucketName = getDepartmentBucket(department);
    const timestamp = Date.now();
    const key = `${userId}/${timestamp}-${file.name}`;

    console.log('📤 Uploading file...');
    console.log('   Bucket:', bucketName);
    console.log('   Key:', key);
    console.log('   Size:', file.size);

    const params = {
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: file.type,
      Metadata: {
        'uploaded-by': userId,
        'department': department,
        'original-name': file.name
      }
    };

    return new Promise((resolve, reject) => {
      this.s3.upload(params)
        .on('httpUploadProgress', (progress) => {
          if (onProgress) {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            onProgress(percentage);
          }
        })
        .send((err, data) => {
          if (err) {
            console.error('❌ Upload error:', err);
            reject(err);
          } else {
            console.log('✅ Upload successful:', data.Key);
            resolve({
              key: data.Key,
              bucket: data.Bucket,
              location: data.Location,
              etag: data.ETag,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              uploadedAt: new Date().toISOString()
            });
          }
        });
    });
  }

  // Upload Multiple Files
  async uploadMultipleFiles(files, department, userId, onProgressAll) {
    this.ensureInitialized();

    const uploads = [];
    let completedFiles = 0;

    for (const file of files) {
      const uploadPromise = this.uploadFile(file, department, userId, (progress) => {
        const overallProgress = ((completedFiles / files.length) * 100) + 
                                ((progress / 100) * (100 / files.length));
        if (onProgressAll) {
          onProgressAll(Math.round(overallProgress));
        }
      }).then(result => {
        completedFiles++;
        return result;
      });

      uploads.push(uploadPromise);
    }

    return Promise.all(uploads);
  }

  // List Files in Department Bucket
  async listFiles(department, userId = null, maxKeys = 100) {
    this.ensureInitialized();

    const bucketName = getDepartmentBucket(department);
    const params = {
      Bucket: bucketName,
      MaxKeys: maxKeys
    };

    if (userId) {
      params.Prefix = `${userId}/`;
    }

    return new Promise((resolve, reject) => {
      this.s3.listObjectsV2(params, (err, data) => {
        if (err) {
          console.error('List error:', err);
          reject(err);
        } else {
          const files = data.Contents.map(item => ({
            key: item.Key,
            size: item.Size,
            lastModified: item.LastModified,
            etag: item.ETag,
            fileName: item.Key.split('/').pop()
          }));
          resolve(files);
        }
      });
    });
  }

  // Get File URL (Pre-signed URL for downloading)
  async getFileUrl(bucket, key, expiresIn = 3600) {
    this.ensureInitialized();

    const params = {
      Bucket: bucket,
      Key: key,
      Expires: expiresIn
    };

    return new Promise((resolve, reject) => {
      this.s3.getSignedUrl('getObject', params, (err, url) => {
        if (err) {
          console.error('Get URL error:', err);
          reject(err);
        } else {
          resolve(url);
        }
      });
    });
  }

  // Delete File
  async deleteFile(bucket, key) {
    this.ensureInitialized();

    const params = {
      Bucket: bucket,
      Key: key
    };

    return new Promise((resolve, reject) => {
      this.s3.deleteObject(params, (err, data) => {
        if (err) {
          console.error('Delete error:', err);
          reject(err);
        } else {
          console.log('File deleted:', data);
          resolve(data);
        }
      });
    });
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default new S3Service();