-- Create leave requests table
CREATE TABLE public.teamhub_leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('leave', 'sick')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable RLS
ALTER TABLE public.teamhub_leave_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own leave requests"
ON public.teamhub_leave_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create own leave requests"
ON public.teamhub_leave_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Managers can view all requests (level 3+)
CREATE POLICY "Managers can view all leave requests"
ON public.teamhub_leave_requests
FOR SELECT
USING (get_user_permission_level(auth.uid()) >= 3);

-- Managers can update requests (level 3+)
CREATE POLICY "Managers can update leave requests"
ON public.teamhub_leave_requests
FOR UPDATE
USING (get_user_permission_level(auth.uid()) >= 3);

-- Create trigger for updated_at
CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.teamhub_leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for common queries
CREATE INDEX idx_leave_requests_user_id ON public.teamhub_leave_requests(user_id);
CREATE INDEX idx_leave_requests_status ON public.teamhub_leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON public.teamhub_leave_requests(start_date, end_date);