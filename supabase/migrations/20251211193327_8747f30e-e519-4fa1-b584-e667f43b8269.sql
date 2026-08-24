-- Create email_templates table for reusable and system email templates
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create email_broadcasts table for logging sent emails
CREATE TABLE public.email_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  template_id UUID REFERENCES public.email_templates(id),
  recipient_count INTEGER NOT NULL,
  successful_count INTEGER NOT NULL,
  failed_count INTEGER DEFAULT 0,
  sent_by UUID REFERENCES public.profiles(id) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_broadcasts ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_templates (admin only)
CREATE POLICY "Admins can view all templates"
ON public.email_templates FOR SELECT
USING (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins can create templates"
ON public.email_templates FOR INSERT
WITH CHECK (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins can update templates"
ON public.email_templates FOR UPDATE
USING (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins can delete non-system templates"
ON public.email_templates FOR DELETE
USING (get_user_permission_level(auth.uid()) >= 4 AND is_system = false);

-- RLS policies for email_broadcasts (admin only, read-only for history)
CREATE POLICY "Admins can view broadcast history"
ON public.email_broadcasts FOR SELECT
USING (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins can create broadcasts"
ON public.email_broadcasts FOR INSERT
WITH CHECK (get_user_permission_level(auth.uid()) >= 4);

-- Trigger for updated_at on email_templates
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system templates
INSERT INTO public.email_templates (name, category, subject, body, is_system) VALUES
('Welcome Email', 'system', 'Welcome to SF:Team Hub', 'Hi {{first_name}},

Welcome to SF:Team Hub! Your account has been created successfully.

To get started, please visit the app and click "Forgot your password?" to set your password.

Best regards,
The SF:Team Hub Team', true),

('Password Reset', 'system', 'Reset Your Password', 'Hi {{first_name}},

We received a request to reset your password for your SF:Team Hub account.

Click the link below to set a new password:
{{reset_link}}

If you did not request this, you can safely ignore this email.

Best regards,
The SF:Team Hub Team', true),

('Invite Reminder', 'system', 'Reminder: Complete Your SF:Team Hub Setup', 'Hi {{first_name}},

This is a friendly reminder that your SF:Team Hub account is waiting for you!

Please visit the app and click "Forgot your password?" to set your password and complete your setup.

Best regards,
The SF:Team Hub Team', true),

('Policy Update', 'policy', 'Important Policy Update', 'Hi Team,

We have made updates to our company policies. Please review the changes below:

{{message}}

If you have any questions, please speak with your manager.

Best regards,
Management', false),

('Shift Change Notice', 'scheduling', 'Shift Schedule Update', 'Hi Team,

Please be aware of the following changes to the shift schedule:

{{message}}

Please acknowledge receipt of this notification.

Best regards,
Scheduling Team', false),

('Company News', 'news', 'Company News Update', 'Hi Team,

{{message}}

Best regards,
SF:Team Hub', false);