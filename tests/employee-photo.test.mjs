import test from 'node:test';
import assert from 'node:assert/strict';
import { employeePhotoSources } from '../src/employee-photo.js';

test('employee photo URL formats share the same high-resolution source and safe fallback', () => {
  const id='example_profile_photo_123456789';
  for(const value of [id,`https://drive.google.com/file/d/${id}/view`,`https://drive.google.com/open?id=${id}`,`https://lh3.googleusercontent.com/d/${id}=s200`]){
    assert.deepEqual(employeePhotoSources(value),[`https://lh3.googleusercontent.com/d/${id}=s800`,`https://drive.google.com/thumbnail?id=${id}&sz=w800`]);
  }
  assert.deepEqual(employeePhotoSources('https://example.test/profile.png'),['https://example.test/profile.png']);
  for(const value of ['',null,'javascript:alert(1)','file:///photo.png','http://example.test/photo.png'])assert.deepEqual(employeePhotoSources(value),[]);
});
