import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/services/adminService';

// DELETE /api/admins/[id] - Delete admin account
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Admin ID is required' },
        { status: 400 }
      );
    }

    // For now, we'll only delete from Firestore
    // TODO: Implement Firebase Admin SDK to delete from Authentication as well
    const result = await adminService.deleteAdmin(id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Admin deleted successfully from database. Note: Firebase Authentication user still exists.'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in DELETE /api/admins/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}