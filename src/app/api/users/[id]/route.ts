import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/services/userService';

// GET /api/users/[id] - fetch single user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }
    const user = await userService.getUserById(id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const result = await userService.updateUser(id, body);
    if (result.success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const result = await userService.deleteUser(id);
    if (result.success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}