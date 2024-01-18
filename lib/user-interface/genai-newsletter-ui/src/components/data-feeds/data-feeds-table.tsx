import { Badge, Button, ButtonDropdown, ButtonDropdownProps, Header, Link, SpaceBetween, Table, TextFilter } from "@cloudscape-design/components";
import { useCallback, useContext, useEffect, useState } from "react";
import { AppContext } from "../../common/app-context";
import { DataFeedSubscription } from "../../API";
import { ApiClient } from "../../common/api";
import { DataFeedsTableColumnDisplay } from "../newsletters/definitions";
import { useNavigate } from "react-router-dom";
import useOnFollow from "../../common/hooks/use-on-follow";


export default function DataFeedsTable() {
    const appContext = useContext(AppContext)
    const navigate = useNavigate()
    const onFollow = useOnFollow()
    const [dataFeeds, setDataFeeds] = useState<DataFeedSubscription[]>([])
    const [selectedDataFeed, setSelectedDataFeed] = useState<DataFeedSubscription>()
    const [loadingDataFeeds, setLoadingDataFeeds] = useState<boolean>(true)

    const getDataFeeds = useCallback(
        async () => {
            if (!appContext) { return }
            const apiClient = new ApiClient(appContext)
            try {
                const result = await apiClient.dataFeeds.listDataFeeds()
                if (result.data !== undefined && result.errors === undefined) {
                    setDataFeeds(result.data.getDataFeedSubscriptions.subscriptions as DataFeedSubscription[])
                }
            } catch (e) {
                console.log(e)
            } finally {
                setLoadingDataFeeds(false)
            }
        }, [appContext]
    )

    const handleUpdateDropdownClick = (event: CustomEvent<ButtonDropdownProps.ItemClickDetails>) => {
        const { detail } = event
        switch (detail.id) {
            case 'edit':
                if (!selectedDataFeed) { return }
                navigate(`/feeds/${selectedDataFeed?.subscriptionId}/edit`)
                break
            default:
                break
        }
    }

    const dataFeedsTableColumnDefiniton = [
        {
            id: 'subscriptionId',
            cell: (item: DataFeedSubscription) => item.subscriptionId,
            header: 'Subscription ID',
            isHeaderRow: false
        },
        {
            id: 'url',
            cell: (item: DataFeedSubscription) => (
                <Link 
                onFollow={onFollow}
                href={`/feeds/${item.subscriptionId}`}>{item.url}</Link>
            ),
            header: 'Feed URL',
            isHeaderRow: true
        },
        {
            id: 'feedType',
            cell: (item: DataFeedSubscription) => item.feedType,
            header: 'Feed Type',
            isHeaderRow: true
        },
        {
            id: 'enabled',
            cell: (item: DataFeedSubscription) => (
                <Badge color={item.enabled ? "green" : "grey"}>{item.enabled ? "ENABLED" : "DISABLED"}</Badge>
            ),
            header: 'Enabled',
            isHeaderRow: true,
        },
        {
            id: 'createdAt',
            cell: (item: DataFeedSubscription) => item.createdAt ? new Date(item.createdAt).toUTCString() : '',
            header: 'Created At',
            isHeaderRow: true,
        }
    ]

    useEffect(() => {
        getDataFeeds()
        setLoadingDataFeeds(false)
    }, [getDataFeeds])

    return (
        <Table
            columnDefinitions={dataFeedsTableColumnDefiniton}
            columnDisplay={DataFeedsTableColumnDisplay}
            items={dataFeeds}
            loading={loadingDataFeeds}
            selectionType="single"
            trackBy="subscriptionId"
            selectedItems={selectedDataFeed ? [selectedDataFeed] : []}
            onSelectionChange={({ detail }) => {
                setSelectedDataFeed(detail.selectedItems[0])
            }}
            filter={
                <TextFilter filteringPlaceholder="Search for Feeds [Not Yet Implemented]" filteringText="" />
            }
            header={<Header actions={
                <SpaceBetween size="s" direction="horizontal">
                    <Button variant="primary" onClick={() => { }} >Create New Data Feed</Button>
                    <ButtonDropdown items={[
                        { id: "edit", text: "Edit Data Feed" },
                    ]} onItemClick={handleUpdateDropdownClick}>Update Data Feed</ButtonDropdown>
                </SpaceBetween>
            } />


            }
        />


    )
}