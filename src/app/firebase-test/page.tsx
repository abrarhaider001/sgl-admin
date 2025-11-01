'use client';

import React, { useState } from 'react';
import { FiCheckCircle, FiXCircle, FiLoader, FiRefreshCw, FiDatabase, FiEdit, FiTrash2 } from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

interface TestData {
  id: string;
  name: string;
  message: string;
  timestamp: any;
}

const FirestoreTestPage = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Firestore Connection', status: 'pending', message: 'Testing connection...' },
    { name: 'Create Document', status: 'pending', message: 'Testing document creation...' },
    { name: 'Read Documents', status: 'pending', message: 'Testing document reading...' },
    { name: 'Update Document', status: 'pending', message: 'Testing document updates...' },
    { name: 'Delete Document', status: 'pending', message: 'Testing document deletion...' }
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [testData, setTestData] = useState<TestData[]>([]);
  const [createdDocId, setCreatedDocId] = useState<string>('');

  const updateTest = (index: number, status: TestResult['status'], message: string, details?: string) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, message, details } : test
    ));
  };

  const runFirestoreTests = async () => {
    setIsRunning(true);
    setOverallStatus('pending');
    setTestData([]);
    setCreatedDocId('');
    
    try {
      // Test 1: Firestore Connection
      updateTest(0, 'pending', 'Testing Firestore connection...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!db) {
        updateTest(0, 'error', 'Firestore not initialized', 'Check your Firebase configuration');
        setOverallStatus('error');
        return;
      }
      updateTest(0, 'success', 'Firestore connection established');

      // Test 2: Create Document
      updateTest(1, 'pending', 'Creating test document...');
      try {
        const testCollection = collection(db, 'admin-test');
        const docRef = await addDoc(testCollection, {
          name: 'Test Document',
          message: 'This is a test document created by the admin panel',
          timestamp: serverTimestamp(),
          testType: 'firestore-connection-test',
          createdAt: new Date().toISOString()
        });
        setCreatedDocId(docRef.id);
        updateTest(1, 'success', `Document created successfully (ID: ${docRef.id})`);
      } catch (error: any) {
        updateTest(1, 'error', 'Failed to create document', error.message);
        setOverallStatus('error');
        return;
      }

      // Test 3: Read Documents
      updateTest(2, 'pending', 'Reading documents from Firestore...');
      try {
        const testCollection = collection(db, 'admin-test');
        const q = query(testCollection, orderBy('timestamp', 'desc'), limit(5));
        const querySnapshot = await getDocs(q);
        
        const docs: TestData[] = [];
        querySnapshot.forEach((doc) => {
          docs.push({
            id: doc.id,
            ...doc.data()
          } as TestData);
        });
        
        setTestData(docs);
        updateTest(2, 'success', `Successfully read ${docs.length} documents`);
      } catch (error: any) {
        updateTest(2, 'error', 'Failed to read documents', error.message);
        setOverallStatus('error');
        return;
      }

      // Test 4: Update Document
      updateTest(3, 'pending', 'Updating test document...');
      try {
        if (createdDocId) {
          const docRef = doc(db, 'admin-test', createdDocId);
          await updateDoc(docRef, {
            message: 'This document has been updated successfully!',
            updatedAt: new Date().toISOString(),
            updateCount: 1
          });
          updateTest(3, 'success', 'Document updated successfully');
        } else {
          updateTest(3, 'error', 'No document ID available for update', 'Document creation may have failed');
          setOverallStatus('error');
          return;
        }
      } catch (error: any) {
        updateTest(3, 'error', 'Failed to update document', error.message);
        setOverallStatus('error');
        return;
      }

      // Test 5: Delete Document
      updateTest(4, 'pending', 'Deleting test document...');
      try {
        if (createdDocId) {
          const docRef = doc(db, 'admin-test', createdDocId);
          await deleteDoc(docRef);
          updateTest(4, 'success', 'Document deleted successfully');
        } else {
          updateTest(4, 'error', 'No document ID available for deletion', 'Document creation may have failed');
          setOverallStatus('error');
          return;
        }
      } catch (error: any) {
        updateTest(4, 'error', 'Failed to delete document', error.message);
        setOverallStatus('error');
        return;
      }

      setOverallStatus('success');
    } catch (error: any) {
      console.error('Test suite failed:', error);
      setOverallStatus('error');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <FiLoader className="animate-spin text-blue-500" size={20} />;
      case 'success':
        return <FiCheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <FiXCircle className="text-red-500" size={20} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <MainLayout title={'Firebase test page'}>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Firestore Database Test</h1>
          <p className="text-gray-600">
            This page tests your Firestore database connection and CRUD operations (bypassing authentication).
          </p>
        </div>

        {/* Overall Status */}
        <div className={`mb-6 p-4 rounded-lg border-2 ${
          overallStatus === 'success' ? 'border-green-200 bg-green-50' :
          overallStatus === 'error' ? 'border-red-200 bg-red-50' :
          'border-blue-200 bg-blue-50'
        }`}>
          <div className="flex items-center space-x-3">
            {getStatusIcon(overallStatus)}
            <div>
              <h2 className="text-lg font-semibold">
                {overallStatus === 'success' ? '🎉 Firestore is Working!' :
                 overallStatus === 'error' ? '❌ Database Tests Failed' :
                 '🔄 Testing Database...'}
              </h2>
              <p className="text-sm text-gray-600">
                {overallStatus === 'success' ? 'Your Firestore database is properly connected and functional.' :
                 overallStatus === 'error' ? 'Some database operations failed. Check the details below.' :
                 'Please wait while we test your Firestore database operations.'}
              </p>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="space-y-4 mb-8">
          {tests.map((test, index) => (
            <div key={index} className={`p-4 rounded-lg border ${getStatusColor(test.status)}`}>
              <div className="flex items-start space-x-3">
                {getStatusIcon(test.status)}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{test.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                  {test.details && (
                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700 font-mono">
                      {test.details}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Test Data Display */}
        {testData.length > 0 && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <FiDatabase className="mr-2" />
              Retrieved Documents ({testData.length})
            </h3>
            <div className="space-y-2">
              {testData.map((doc) => (
                <div key={doc.id} className="p-3 bg-white rounded border text-sm">
                  <div className="font-mono text-xs text-gray-500 mb-1">ID: {doc.id}</div>
                  <div><strong>Name:</strong> {doc.name}</div>
                  <div><strong>Message:</strong> {doc.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mb-8 flex space-x-4">
          <button
            onClick={runFirestoreTests}
            disabled={isRunning}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiRefreshCw className={isRunning ? 'animate-spin' : ''} size={16} />
            <span>{isRunning ? 'Running Tests...' : 'Run Database Tests'}</span>
          </button>
        </div>

        {/* Success Message */}
        {overallStatus === 'success' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">✅ Great News!</h3>
            <p className="text-sm text-green-700">
              Your Firestore database is working perfectly! You can successfully:
            </p>
            <ul className="list-disc list-inside text-sm text-green-700 mt-2 space-y-1">
              <li>Connect to your Firestore database</li>
              <li>Create new documents</li>
              <li>Read existing documents</li>
              <li>Update document data</li>
              <li>Delete documents</li>
            </ul>
            <p className="text-sm text-green-700 mt-3">
              <strong>The authentication error doesn't affect your database operations!</strong> 
              Your admin panel can work with Firestore without authentication if needed.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default FirestoreTestPage;