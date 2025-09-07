'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PageShell } from '@/components/ui/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar, Clock, User, Mail, FileText, CheckCircle, XCircle, AlertCircle, Send, RefreshCw, Package } from 'lucide-react'
import { toast } from 'sonner'
import { formatLondon, formatLondonDate, formatLondonTime } from '@/lib/time'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import FormSubmissionViewer from '@/components/forms/FormSubmissionViewer'
import { Checkbox } from '@/components/ui/Checkbox'

interface OffboardingData {
  id: string;
  status: string;
  initiatedAt: string;
  completedAt?: string;
  
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    jobRole?: string;
    isActive: boolean;
  };
  
  initiatedBy: {
    id: string;
    name: string;
    email: string;
  };
  
  exitInterview: {
    date?: string;
    endTime?: string;
    interviewer: {
      id?: string;
      name: string;
      email: string;
    };
    location?: string;
    notes?: string;
    sendForm: boolean;
    formTemplate?: {
      id: string;
      name: string;
      description?: string;
      schemaJson?: any;
    };
    formTiming?: string;
    completionStatus: string;
    inviteLastSentAt?: string;
    scheduledSendAt?: string;
  };
  
  formSubmissions: Array<{
    id: string;
    templateName: string;
    templateSchema?: any;
    submittedAt?: string;
    submittedBy?: string;
    answersJson?: Record<string, any>;
  }>;

  createdAt: string;
  updatedAt: string;

  assetsToReturn?: { name: string; returned: boolean }[];
  assetsReturned?: boolean;
  assetsReturnedAt?: string;
}

export default function EmployeeOffboardingPage() {
  const params = useParams()
  const employeeId = params?.id as string
  
  const [offboarding, setOffboarding] = useState<OffboardingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingInvite, setSendingInvite] = useState(false)
  const [sendingFormInvite, setSendingFormInvite] = useState(false)

  useEffect(() => {
    if (employeeId) {
      fetchOffboardingData()
    }
  }, [employeeId])

  const fetchOffboardingData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/offboarding/${employeeId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch offboarding data')
      }
      
      const data = await response.json()
      if (Array.isArray(data.assetsToReturn)) {
        data.assetsToReturn = data.assetsToReturn.map((a: any) =>
          typeof a === 'string' ? { name: a, returned: false } : a
        )
      }
      setOffboarding(data)
    } catch (error) {
      console.error('Error fetching offboarding data:', error)
      toast.error('Failed to load offboarding information')
    } finally {
      setLoading(false)
    }
  }

  const handleAssetToggle = async (index: number) => {
    if (!offboarding) return

    const updatedAssets = (offboarding.assetsToReturn || []).map((asset, i) =>
      i === index ? { ...asset, returned: !asset.returned } : asset
    )

    setOffboarding({ ...offboarding, assetsToReturn: updatedAssets })

    try {
      await fetch(`/api/offboarding/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetsToReturn: updatedAssets })
      })
    } catch (error) {
      console.error('Error updating assets:', error)
      toast.error('Failed to update assets')
    }
  }

  const handleSendInvite = async () => {
    if (!offboarding) return
    
    try {
      setSendingInvite(true)
      const response = await fetch('/api/offboarding/send-invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offboardingId: offboarding.id
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send invite')
      }

      toast.success('Exit interview confirmation sent successfully')
      fetchOffboardingData() // Refresh data to get updated inviteLastSentAt
    } catch (error) {
      console.error('Error sending invite:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send invite')
    } finally {
      setSendingInvite(false)
    }
  }

  const handleSendFormInvite = async () => {
    if (!offboarding) return

    try {
      setSendingFormInvite(true)
      // Use the dedicated form invitation endpoint
      const response = await fetch('/api/offboarding/send-form-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offboardingId: offboarding.id
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send form invite')
      }

      toast.success('Exit interview form invitation sent successfully')
      fetchOffboardingData() // Refresh data
    } catch (error) {
      console.error('Error sending form invite:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send form invite')
    } finally {
      setSendingFormInvite(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="outline">Scheduled</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="secondary">In Progress</Badge>
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getCompletionStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>
      case 'STARTED':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Started</Badge>
      case 'SUBMITTED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Submitted</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <PageShell title="Offboarding Details" description="Employee offboarding information">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageShell>
    )
  }

  if (!offboarding) {
    return (
      <PageShell title="Offboarding Details" description="Employee offboarding information">
        <Card>
          <CardContent className="text-center p-8">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No offboarding record found</h3>
            <p className="text-gray-600">This employee does not have an offboarding record.</p>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell 
      title={`Offboarding - ${offboarding.employee.firstName} ${offboarding.employee.lastName}`}
      description="Employee offboarding information and exit interview details"
    >
      <div className="space-y-6">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Offboarding Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Employee Information</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Name:</span> {offboarding.employee.firstName} {offboarding.employee.lastName}</p>
                  <p><span className="font-medium">Email:</span> {offboarding.employee.email}</p>
                  <p><span className="font-medium">Department:</span> {offboarding.employee.department || 'N/A'}</p>
                  <p><span className="font-medium">Job Role:</span> {offboarding.employee.jobRole || 'N/A'}</p>
                  <p><span className="font-medium">Status:</span> {getStatusBadge(offboarding.status)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Process Information</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Initiated by:</span> {offboarding.initiatedBy.name}</p>
                  <p><span className="font-medium">Initiated on:</span> {formatLondonDate(offboarding.initiatedAt)}</p>
                  {offboarding.completedAt && (
                    <p><span className="font-medium">Completed on:</span> {formatLondonDate(offboarding.completedAt)}</p>
                  )}
                  <p><span className="font-medium">Last updated:</span> {formatLondonDate(offboarding.updatedAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assets to Return */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Assets to Return
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {offboarding.assetsToReturn && offboarding.assetsToReturn.length > 0 ? (
              <div className="space-y-2">
                {offboarding.assetsToReturn.map((asset, idx) => (
                  <div key={asset.name} className="flex items-center gap-2">
                    <Checkbox
                      id={`asset-${idx}`}
                      checked={asset.returned}
                      onCheckedChange={() => handleAssetToggle(idx)}
                    />
                    <label htmlFor={`asset-${idx}`} className="text-sm">
                      {asset.name}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No assets listed</p>
            )}
          </CardContent>
        </Card>

        {/* Exit Interview Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Exit Interview Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {offboarding.exitInterview.date ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Interview Schedule</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Date:</span> {formatLondonDate(offboarding.exitInterview.date)}</p>
                    <p><span className="font-medium">Time:</span> {formatLondonTime(offboarding.exitInterview.date)}</p>
                    {offboarding.exitInterview.endTime && (
                      <p><span className="font-medium">End Time:</span> {formatLondonTime(offboarding.exitInterview.endTime)}</p>
                    )}
                    <p><span className="font-medium">Location:</span> {offboarding.exitInterview.location || 'Not specified'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Interviewer</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {offboarding.exitInterview.interviewer.name}</p>
                    <p><span className="font-medium">Email:</span> {offboarding.exitInterview.interviewer.email}</p>
                  </div>
                  
                  {offboarding.exitInterview.notes && (
                    <div className="mt-3">
                      <h5 className="font-medium text-gray-900 mb-1">Notes</h5>
                      <p className="text-sm text-gray-600">{offboarding.exitInterview.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-600">No exit interview scheduled</p>
            )}

            {/* Email Actions */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Email Management</span>
                </div>
                <Button
                  onClick={handleSendInvite}
                  disabled={sendingInvite || !offboarding.exitInterview.date}
                  size="sm"
                >
                  {sendingInvite ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Resend Invite
                    </>
                  )}
                </Button>
              </div>
              
              {offboarding.exitInterview.inviteLastSentAt && (
                <p className="text-sm text-gray-500 mt-1">
                  Last sent: {formatLondon(offboarding.exitInterview.inviteLastSentAt)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Exit Interview Form */}
        {offboarding.exitInterview.sendForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Exit Interview Form
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Form Configuration</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Template:</span> {offboarding.exitInterview.formTemplate?.name || 'N/A'}</p>
                    <p><span className="font-medium">Timing:</span> {offboarding.exitInterview.formTiming || 'N/A'}</p>
                    <p><span className="font-medium">Status:</span> {getCompletionStatusBadge(offboarding.exitInterview.completionStatus)}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Form Submissions</h4>
                  {offboarding.formSubmissions.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          {offboarding.formSubmissions.length} submission{offboarding.formSubmissions.length !== 1 ? 's' : ''} completed
                        </p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="primary">View Completed Submissions</Button>
                          </DialogTrigger>
                          <DialogContent title="Completed Form Submissions" className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <div className="space-y-6">
                              {offboarding.formSubmissions.map((submission, index) => (
                                <div key={submission.id} className="border rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-medium text-lg">{submission.templateName}</h3>
                                    {submission.submittedAt && (
                                      <p className="text-sm text-gray-600">
                                        Submitted: {formatLondon(submission.submittedAt)}
                                      </p>
                                    )}
                                  </div>
                                  <FormSubmissionViewer
                                    schema={submission.templateSchema || offboarding.exitInterview.formTemplate?.schemaJson}
                                    answers={submission.answersJson}
                                  />
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {/* Individual submission list */}
                      <div className="space-y-2">
                        {offboarding.formSubmissions.map((submission) => (
                          <div key={submission.id} className="flex items-center justify-between text-sm border rounded p-2">
                            <div>
                              <p><span className="font-medium">{submission.templateName}</span></p>
                              {submission.submittedAt && (
                                <p className="text-gray-600">
                                  Submitted: {formatLondon(submission.submittedAt)}
                                </p>
                              )}
                            </div>
                            {submission.answersJson && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">View Submission</Button>
                                </DialogTrigger>
                                <DialogContent title="Form Submission">
                                  <FormSubmissionViewer
                                    schema={submission.templateSchema || offboarding.exitInterview.formTemplate?.schemaJson}
                                    answers={submission.answersJson}
                                  />
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No submissions yet</p>
                  )}
                </div>
              </div>
              
              {offboarding.exitInterview.scheduledSendAt && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Scheduled to send form on:</span> {formatLondon(offboarding.exitInterview.scheduledSendAt)}
                  </p>
                </div>
              )}

              {/* Manual Form Invitation / Resend Button */}
              {offboarding.exitInterview.sendForm &&
               ['ON_DATE', 'NOW'].includes(offboarding.exitInterview.formTiming || '') &&
               offboarding.exitInterview.completionStatus !== 'SUBMITTED' && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        {offboarding.exitInterview.formTiming === 'NOW' ? 'Resend Form' : 'Manual Form Invitation'}
                      </span>
                    </div>
                    <Button
                      onClick={handleSendFormInvite}
                      disabled={sendingFormInvite}
                      size="sm"
                      variant="outline"
                    >
                      {sendingFormInvite ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          {offboarding.exitInterview.formTiming === 'NOW' ? 'Resend Form' : 'Send Form Now'}
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {offboarding.exitInterview.formTiming === 'NOW'
                      ? 'Resend the exit interview form invitation'
                      : 'Manually trigger the exit interview form invitation (bypasses scheduled timing)'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  )
}
